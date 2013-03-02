#!/bin/bash

USER=szydan
START_URL="$4"

GOOGLE_CHROME_PROFILE_DIR=/Users/$USER/chrome-profiles/
WEBKIT_PROFILE_DIR=/Users/$USER/webkit-profiles/

WEBKIT_INSTANCE_PATH="/Applications/WebKit.app/Contents/MacOS/WebKit"
GOOGLE_CHROME_INSTANCE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" 

# do not use --no-startup-window as it will not start the client

case "$1" in
        start)

			case "$3" in 
			chrome)
				mkdir -p $GOOGLE_CHROME_PROFILE_DIR
				for i in $(seq 1 $2); do
		 			echo "starting $GOOGLE_CHROME_PROFILE_DIR$i" 
						 "$GOOGLE_CHROME_INSTANCE_PATH" $START_URL  --user-data-dir=$GOOGLE_CHROME_PROFILE_DIR$i > /dev/null 2>&1 &
					sleep 2s
				done
			;;
			webkit)
				mkdir -p $WEBKIT_PROFILE_DIR
				for i in $(seq 1 $2); do
		 			echo "starting $WEBKIT_PROFILE_DIR$i" 
						 "$WEBKIT_INSTANCE_PATH" $START_URL  --user-data-dir=$WEBKIT_PROFILE_DIR$i > /dev/null 2>&1 &
					sleep 2s
				done
			;;
			*)
				mkdir -p $GOOGLE_CHROME_PROFILE_DIR
				for i in $(seq 1 $2); do
		 			echo "starting $GOOGLE_CHROME_PROFILE_DIR$i" 
						 "$GOOGLE_CHROME_INSTANCE_PATH" $START_URL  --user-data-dir=$GOOGLE_CHROME_PROFILE_DIR$i > /dev/null 2>&1 &
					sleep 2s
				done
			esac

        ;;
        stop)

        	case "$2" in 
			chrome)
        		killall -9 Google\ Chrome
    			echo "Stopping all Google Chrome instances"
        	;;
    		webkit)
        		echo "Stopping all Webkit instances"
        		killall -9 Safari
    		;;
    		*)
    		#do nothing
    		esac
        
        ;;
        *)
            echo $"Usage: $0 {start number webkit/chrome http://localhost:4000 | stop webkit/chrome}"
            exit 1
 
esac


