#!/bin/bash


case "$1" in
        start)
		for i in $(seq 1 $2); do
			N=$((100-$i))
			echo $N		
			echo "starting $i $N" 
			xvfb-run --server-num=$N google-chrome  $3 --user-data-dir=/tmp/junk$i > /dev/null &
			sleep 2s
		done
	;;
	stop)
		killall -9 xvfb-run & killall -9 Xvfb & rm -rf /tmp/.X*-lock & rm -rf /tmp/xvfb-run.*
	;;
	*)
            echo $"Usage: $0 {start|stop  number url}"
            exit 1
 
esac
