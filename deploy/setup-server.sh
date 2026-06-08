#!/usr/bin/env bash
# 서버(Ubuntu 22.04) 초기 세팅 - 서버에서 한 번만 실행한다. (DigitalOcean/AWS/Oracle 공통)
#   bash deploy/setup-server.sh
set -e

echo "==> [1/4] 시스템 업데이트"
sudo apt-get update -y

echo "==> [2/4] Docker 설치"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
else
  echo "    (이미 설치됨)"
fi

echo "==> [3/4] 방화벽 80포트 개방 (일부 클라우드는 OS iptables로도 막혀있음; DigitalOcean은 불필요)"
# 기본 iptables 체인의 REJECT 앞에 ACCEPT 삽입 (실패 시 맨 앞에 삽입)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null \
  || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
# iptables-persistent 설치 시 뜨는 대화창을 미리 자동 응답(noninteractive)하여 멈춤 방지
export DEBIAN_FRONTEND=noninteractive
echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | sudo debconf-set-selections
echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | sudo debconf-set-selections
sudo apt-get install -y iptables-persistent >/dev/null 2>&1 || true
sudo netfilter-persistent save >/dev/null 2>&1 || true

echo "==> [4/4] 스왑 메모리 (RAM 4GB 미만이면 2GB 추가 - 빌드 OOM 방지)"
MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "${MEM_MB:-0}" -lt 4000 ] && [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "    스왑 2GB 추가됨"
else
  echo "    (스왑 불필요 또는 이미 존재)"
fi

echo ""
echo "==> 세팅 완료! 한 번 로그아웃 후 다시 SSH 접속하면 sudo 없이 docker 사용 가능."
echo "    (또는 즉시 사용하려면:  newgrp docker )"
