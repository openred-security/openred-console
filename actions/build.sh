## Install nvm 
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" 

## Create console binaries 
nvm install
nvm use
npm i -g yarn
yarn osd bootstrap
yarn build-platform --linux
# target/opensearch-dashboards-2.6.0-SNAPSHOT-linux-x64.tar.gz
cd actions/docker/release/
sudo ./build-image-single-arch.sh -v 2.13.0 -f ./dockerfiles/opensearch-dashboards.al2.dockerfile -p opensearch-dashboards -a x64 -t opensearch-dashboards-2.13.0-SNAPSHOT-linux-x64.tar.gz

