@echo off
if not exist node_modules npm install
node server.js
pause