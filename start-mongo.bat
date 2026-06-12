@echo off
echo Starting MongoDB in User Mode...
if not exist "%~dp0mongodb-data" (
    mkdir "%~dp0mongodb-data"
)
"C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "%~dp0mongodb-data" --port 27017 --wiredTigerCacheSizeGB 0.25
