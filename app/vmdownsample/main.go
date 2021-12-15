package main

import (
	"flag"
	"github.com/VictoriaMetrics/VictoriaMetrics/lib/envflag"
	"github.com/VictoriaMetrics/VictoriaMetrics/lib/storage"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/VictoriaMetrics/VictoriaMetrics/lib/logger"
)

func main() {
	// Write flags and help message to stdout, since it is easier to grep or pipe.
	flag.CommandLine.SetOutput(os.Stdout)
	envflag.Parse()
	//buildinfo.Init()
	logger.Init()

	logger.Infof("test")
	startTime := time.Now()

	sum := float64(0)
	processStorage("/home/dl/work/baraded/downsample/data/storage/data/big/", &sum)
	processStorage("/home/dl/work/baraded/downsample/data/storage/data/small/", &sum)

	logger.Infof("sum: %#v\n", sum)
	logger.Infof("successfully stopped vmdownsample in %.3f seconds", time.Since(startTime).Seconds())
}

func processStorage(dir string, sum *float64) {
	monthDirs, err := ioutil.ReadDir(dir)
	if err != nil {
		logger.Panicf("error", err)
	}
	for j := range monthDirs {
		dirpath := filepath.Join(dir, monthDirs[j].Name())
		logger.Infof("Process month: %#v\n", dirpath)
		processMonth(dirpath, sum)
	}
}

func processMonth(monthPath string, sum *float64) {
	partDirs, err := ioutil.ReadDir(monthPath)
	if err != nil {
		logger.Panicf("error", err)
		return
	}
	for i := range partDirs {
		//err := TestRead("/home/dl/work/baraded/downsample/data/45175_1145_20210908151527.497_20210908151606.772_16A2E1A93DB4F8A4")
		//path := "/home/dl/work/baraded/downsample/data/storage/data/small/2021_06/60659_1612_20210629062632.414_20210629063403.158_168CF996FC57D673"
		//path := "/home/dl/work/baraded/downsample/data/storage/data/small/2021_06/63645_1704_20210618000000.000_20210629064643.158_168CF996FC57D703"
		//path := "/home/dl/work/baraded/downsample/data/storage/data/small/2021_06/8529_1706_20210629065422.414_20210629065503.158_168CF996FC57D75F"
		//path := "/home/dl/work/baraded/downsample/data/storage/data/small/2021_06/60659_1612_20210629062632.414_20210629063403.158_168CF996FC57D673"
		//path := "/home/dl/work/baraded/downsample/data/storage/data/small/2021_06/60659_1612_20210629062632.414_20210629063403.158_168CF996FC57D673"
		name := partDirs[i].Name()
		if name == "tmp" || name == "txn" {
			continue
		}
		// Test
		//if name != "60659_1612_20210629062632.414_20210629063403.158_168CF996FC57D673" {
		//if name != "48626_258_20210615063208.022_20210629062712.414_168CF996FC57D61F" {
		//	continue
		//}
		path := filepath.Join(monthPath, name)
		var reader *storage.BlockStreamReaderTest = &storage.BlockStreamReaderTest{}

		err := reader.Test(path, sum)
		if err != nil {
			logger.Panicf("error", err)
			return
		}
	}
}
