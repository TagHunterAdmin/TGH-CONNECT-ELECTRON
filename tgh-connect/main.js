'use strict'

const { ipcMain } = require('electron/main')
const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const app = electron.app
const globalShortcut = electron.globalShortcut
const os = require('os')
const path = require('path')
const config = require(path.join(__dirname, 'package.json'))
const wifi = require('wifi-control')
const fs = require('fs');
const readline = require('readline');
var parse = require('csv-parse')
const computerName = os.hostname()
const { updateElectronApp } = require('update-electron-app')
updateElectronApp()
app.setName(config.productName)
var mainWindow = null

app.on('ready', function () {
  mainWindow = new BrowserWindow({
    backgroundColor: 'lightgray',
    title: config.productName,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      defaultEncoding: 'UTF-8',
      worldSafeExecuteJavaScript: true,
      /* See https://stackoverflow.com/questions/63427191/security-warning-in-the-console-of-browserwindow-electron-9-2-0 */
      enableRemoteModule: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'app/preload.js')
    }
  })

  mainWindow.webContents.openDevTools()

  mainWindow.loadURL(`file://${__dirname}/app/index.html`)

  // Enable keyboard shortcuts for Developer Tools on various platforms.
  let platform = os.platform()
  if (platform === 'darwin') {
    globalShortcut.register('Command+Option+I', () => {
      mainWindow.webContents.openDevTools()
    })
  } else if (platform === 'linux' || platform === 'win32') {
    globalShortcut.register('Control+Shift+I', () => {
      mainWindow.webContents.openDevTools()
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.setMenu(null)
    mainWindow.show()
    checkEventsFile();
    checkConfig();

    // setTimeout(function () {
    //   // checkNewBip()
    //   mainWindow.webContents.send('csv', countFileLines('"C:/Users/faure/Documents/TagHunter_Connect/events.csv"'));
    // }, 1000);
    setTimeout(function () {
      getEventsPath();
    }, 2000);

    setTimeout(function () {
      checkConfig();
    }, 2000);

    setTimeout(function () {
      mainWindow.webContents.send('device_uniq', computerName);
    }, 2000);
    
    setInterval(function () {
      getWifi();
    }, 5000);
  })

  app.whenReady().then(() => {

    ipcMain.on('update_user_email', (event, user_email) => {
      updateUserEmail(user_email);
    });

    ipcMain.on('get_raw_data_file', (event, file_path) => {
      getRawDataFile(file_path);
    });

    ipcMain.on('get_raw_data_folders', (data) => {
      getRawDataFolders();
    });

    ipcMain.on('get_raw_data_single_folder', (event, folder_name) => {
      getRawDataSingleFolder(folder_name);
    });
    ipcMain.on('get_events_path', (data) => {
      getEventsPath();
    });
    ipcMain.on('get_config_data', (data) => {
      checkConfig();
    });
    ipcMain.on('get_device_uniq', (data) => {
      mainWindow.webContents.send('device_uniq', computerName);
    });
    ipcMain.on("create_launched_game_file", (event, data) => {
      createLaunchedGameFile(data);
    });
    ipcMain.on("check_new_bip", (event, data) => {
      checkNewBip(process.env.USERPROFILE + '\\Documents' + '/TagHunter_Connect/events.csv', data);
    });
    // ipcMain.handle('getWifiName', () => getWifiName())
  })
  mainWindow.onbeforeunload = (e) => {
    // Prevent Command-R from unloading the window contents.
    e.returnValue = false
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })
})


app.on('window-all-closed', () => { app.quit() })

function updateUserEmail(user_email){
  fs.writeFile(path.join(__dirname, '/config.txt'), user_email, function (err) {
    if (err) {
      console.log(err)
    }else{
      mainWindow.webContents.send('response_update_user_email', user_email);
    }
  });
}

function getEventsPath(){
  var events_path = process.env.USERPROFILE + '\\Documents' + '/TagHunter_Connect/events.csv';
  mainWindow.webContents.send('events_path', events_path);
}

function getRawDataFile(file_path) {
  var dirPath = path.join(__dirname, '/launched_games/' + file_path);
  fs.readFile(dirPath, { encoding: 'utf-8' }, function (err, data) {
    mainWindow.webContents.send('raw_data_file', data);
  });
}
function getRawDataSingleFolder(folder_name) {
  var dirPath = path.join(__dirname, '/launched_games/' + folder_name);
  fs.readdir(dirPath, (err, files) => {
    mainWindow.webContents.send('raw_data_single_folder', files);
  });
}

function getRawDataFolders() {
  var dirPath = path.join(__dirname, '/launched_games');
  fs.readdir(dirPath, function (err, filesPath) {
    if (err) throw err;
    console.log(filesPath);
    mainWindow.webContents.send('raw_data_folders', filesPath);
  });
}

function getLaunchedGameFileName(data) {
  var launched_game_name = data.launched_game_title;
  launched_game_name = launched_game_name.replace(/[^a-zA-Z0-9]/g, '_');
  return data.launched_game_id + '_' + launched_game_name.replace(/\s+/g, '_') + '.txt';
}

function getDirLaunchedGameFiles() {
  var now = new Date(Date.now());
  var the_path = path.join(__dirname, '/launched_games/' + now.getMonth());
  if (!fs.existsSync(the_path)) {
    fs.mkdirSync(the_path);
  }
  return the_path;
}

function getPathLaunchedGameFile(data) {
  return getDirLaunchedGameFiles() + '/' + getLaunchedGameFileName(data)
}

function createLaunchedGameFile(data) {
  var content = '';
  fs.writeFile(getPathLaunchedGameFile(data), content, { flag: 'wx' }, function (err) {
    if (err) {
      console.log(err)
    }
  });
}

function checkNewBip(filePath, launched_game_data) {
  var the_line = '';
  var linesCount = 0;
  var rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    output: process.stdout,
    terminal: false
  });
  rl.on('line', function (line) {
    linesCount++;
    the_line = line;// on each linebreak, add +1 to 'linesCount'
  });
  rl.on('close', function () {

    fs.readFile(path.join(__dirname, '/linecount.txt'), { encoding: 'utf-8' }, function (err, data) {
      if (!err) {
        var start_count_lines = parseInt(data)
        if (linesCount > start_count_lines) {
          mainWindow.webContents.send('reply_check_new_bip', the_line);
          fs.appendFile(getPathLaunchedGameFile(launched_game_data), the_line + '\r\n', err => {
            if (err) {
              console.log(err);
            } else {
              // done!
            }
          });

          fs.writeFile(path.join(__dirname, '/linecount.txt'), linesCount.toString(), err => {
            if (err) {
              console.error(err);
            } else {
              // file written successfully
              console.error('file written successfully');
            }
          })

        }


      } else {
        mainWindow.webContents.send('reply_check_new_bip', err);
        console.log(err);
      }
    });

  });
}


function getWifi() {
  wifi.init({
    debug: false,
    connectionTimeout: 10000
    // iface: null // set to `null` to use the default interface
  });

  wifi.scanForWiFi(function (err, response) {
    var renderer_data = {
      type: ''
    }
    if (err) { // WIFI not activated
      renderer_data.type = 'no_wifi';
      mainWindow.webContents.send('wifi_data', renderer_data);
    } else {
      if (response) {
        var networks = response.networks;
        var tgh_exists = false;
        networks.forEach((network) => {
          var ssid = network.ssid;
          if (ssid.indexOf("unter") >= 0) {// TGH network exists but might not be connected
            tgh_exists = true;
            renderer_data = wifi.getIfaceState(network.ssid);
            renderer_data.type = 'tgh_network'
            mainWindow.webContents.send('wifi_data', renderer_data);
          }


        });
        if (!tgh_exists) {// TGH network does not exists
          renderer_data.type = 'no_tgh';
          mainWindow.webContents.send('wifi_data', renderer_data);
        }
      }
    }

  });

}

function checkConfig() {

  var the_path = process.env.USERPROFILE + '\\Documents' + '/TagHunter_Connect'
  if (!fs.existsSync(the_path)) {
    fs.mkdirSync(the_path, function (err) {
      if(err){
        console.log(err)
      }
    });
  }

  if (!fs.existsSync(the_path+'/events.csv')) {
    var content = '';

    fs.writeFile(the_path+'/events.csv', content, { flag: 'wx' }, function (err) {
      if (err) {
        console.log(err)
      }
    });
  };

  var dirPath = path.join(__dirname, '/launched_games');
  var the_month = new Date(Date.now()).getMonth();
  fs.readdir(dirPath, function (err, folders) {
    if (err) throw err;
    folders.forEach((folder) => {
      if(folder <= the_month -2){
        fs.rmSync(path.join(__dirname, '/launched_games/'+folder), { recursive: true, force: true });
      }
    });
  
  });

  var file_path = path.join(__dirname, '/config.txt');

  fs.readFile(file_path, { encoding: 'utf-8' }, function (err, data) {
    mainWindow.webContents.send('config_data', data);
  });
  // mainWindow.webContents.send('device_uniq', computerName);

}

function checkEventsFile() {
  fs.readdir('C:/Users/faure/Documents/TagHunter_Connect', (err, files) => {
    mainWindow.webContents.send('events_file', err);
    mainWindow.webContents.send('events_file', files);
  });
}