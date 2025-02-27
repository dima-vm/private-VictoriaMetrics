import {useEffect, useMemo, useState} from "react";
import {getQueryRangeUrl, getQueryUrl} from "../../../../api/query-range";
import {useAppState} from "../../../../state/common/StateContext";
import {InstantMetricResult, MetricBase, MetricResult} from "../../../../api/types";
import {isValidHttpUrl} from "../../../../utils/url";
import {useAuthState} from "../../../../state/auth/AuthStateContext";
import {ErrorTypes, TimeParams} from "../../../../types";
import {useGraphState} from "../../../../state/graph/GraphStateContext";

export const useFetchQuery = (): {
  fetchUrl?: string[],
  isLoading: boolean,
  graphData?: MetricResult[],
  liveData?: InstantMetricResult[],
  error?: ErrorTypes | string,
} => {
  const {query, displayType, serverUrl, time: {period}, queryControls: {nocache}} = useAppState();

  const {basicData, bearerData, authMethod} = useAuthState();
  const {customStep} = useGraphState();

  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState<MetricResult[]>();
  const [liveData, setLiveData] = useState<InstantMetricResult[]>();
  const [error, setError] = useState<ErrorTypes | string>();
  const [prevPeriod, setPrevPeriod] = useState<TimeParams>();

  useEffect(() => {
    if (error) {
      setGraphData(undefined);
      setLiveData(undefined);
    }
  }, [error]);

  const needUpdateData = useMemo(() => {
    if (!prevPeriod) return true;
    const duration = (prevPeriod.end - prevPeriod.start) / 3;
    const factorLimit = duration / (period.end - period.start) >= 0.7;
    const maxLimit = period.end > (prevPeriod.end + duration);
    const minLimit = period.start < (prevPeriod.start - duration);
    return factorLimit || maxLimit || minLimit;
  }, [period]);

  const fetchData = async () => {
    if (!fetchUrl?.length) return;
    setIsLoading(true);
    setPrevPeriod(period);

    const headers = new Headers();
    if (authMethod === "BASIC_AUTH") {
      headers.set("Authorization", "Basic " + btoa(`${basicData?.login || ""}:${basicData?.password || ""}`));
    }
    if (authMethod === "BEARER_AUTH") {
      headers.set("Authorization", bearerData?.token || "");
    }

    try {
      const responses = await Promise.all(fetchUrl.map(url => fetch(url, {headers})));
      const tempData = [];
      let counter = 1;
      for await (const response of responses) {
        const resp = await response.json();
        if (response.ok) {
          setError(undefined);
          tempData.push(...resp.data.result.map((d: MetricBase) => {
            d.group = counter;
            return d;
          }));
          counter++;
        } else {
          setError(`${resp.errorType}\r\n${resp?.error}`);
        }
      }
      displayType === "chart" ? setGraphData(tempData) : setLiveData(tempData);
    } catch (e) {
      if (e instanceof Error) setError(`${e.name}: ${e.message}`);
    }

    setIsLoading(false);
  };

  const fetchUrl = useMemo(() => {
    if (!period) return;
    if (!serverUrl) {
      setError(ErrorTypes.emptyServer);
    } else if (query.every(q => !q.trim())) {
      setError(ErrorTypes.validQuery);
    } else if (isValidHttpUrl(serverUrl)) {
      const duration = (period.end - period.start) / 2;
      const bufferPeriod = {...period, start: period.start - duration, end: period.end + duration};
      if (customStep.enable) bufferPeriod.step = customStep.value;
      return query.filter(q => q.trim()).map(q => displayType === "chart"
        ? getQueryRangeUrl(serverUrl, q, bufferPeriod, nocache)
        : getQueryUrl(serverUrl, q, period));
    } else {
      setError(ErrorTypes.validServer);
    }
  },
  [serverUrl, period, displayType, customStep]);

  useEffect(() => {
    setPrevPeriod(undefined);
  }, [query]);

  // TODO: this should depend on query as well, but need to decide when to do the request.
  //       Doing it on each query change - looks to be a bad idea. Probably can be done on blur
  useEffect(() => {
    fetchData();
  }, [serverUrl, displayType, customStep]);

  useEffect(() => {
    if (needUpdateData) {
      fetchData();
    }
  }, [period]);

  return {
    fetchUrl,
    isLoading,
    graphData,
    liveData,
    error
  };
};
