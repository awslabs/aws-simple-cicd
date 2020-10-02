set -e
set -u
set -o pipefail

cd ../demo

# Build Java App
mvn clean package --no-transfer-progress
