#!/bin/sh
set -e
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
MAGE="\033[35m"
CYAN="\033[36m"
BOLD="\033[1m"
RESET="\033[0m"

spin() {
	local pid=$!
	local spinstr="-\|/"
	while [ $(ps a | awk '{print $1}' | grep $pid) ];
	do
		local temp=${spinstr#?}
		tput civis
		printf "\r${GREEN}[${YELLOW}%c${GREEN}]${RESET} " "$spinstr"
		local spinstr=$temp${spinstr%"$temp"}
		sleep 0.25
		printf "\b\b\b\b\b\b\b"
	done
	tput cnorm
}

printf $GREEN
cat <<-'EOF'
=================================================
    ____           __        ____        __
   /  _/___  _____/ /_____ _/ __ )____  / /______
   / // __ \/ ___/ __/ __ `/ __  / __ \/ __/ ___/
 _/ // / / (__  ) /_/ /_/ / /_/ / /_/ / /_(__  )
/___/_/ /_/____/\__/\__,_/_____/\____/\__/____/

=================================================
EOF
printf $RESET
sleep 1
printf "    Updating... "
pkg update -y &> /dev/null & spin
printf $GREEN"[✓] Update Complete! \n"$RESET
printf "    Downloading... "
sleep 5 &> /dev/null & spin
printf $GREEN"[✓] Download Complete! \n"$RESET


