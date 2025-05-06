// const { contextBridge } = require('electron')
// const { contextBridge, ipcRenderer  } = require('electron/renderer')
const { contextBridge, ipcRenderer } = require('electron')
// const wifiName = require('wifi-name');
// const wifi = require('node-wifi');

contextBridge.exposeInMainWorld('wifi_data', {
    wifi_data: () => getWifiName()
})


// White-listed channels.
const ipc = {
    'render': {
        // From render to main.
        'send': [
            'openDetailsWindow',
            'get_device_uniq',
            'check_new_bip',
            'create_launched_game_file',
            'get_raw_data_folders',
            'get_raw_data_single_folder',
            'get_raw_data_file',
            'get_config_data',
            'get_events_path',
            'update_user_email'
        ],
        // From main to render.
        'receive': [
            'wifi_data',
            'events_file',
            'device_uniq',
            'reply_check_new_bip',
            'raw_data_folders',
            'raw_data_single_folder',
            'raw_data_file',
            'config_data',
            'events_path',
            'response_update_user_email',

        ],
        // From render to main and back again.
        'sendReceive': [
            'search',
        ],

    }
};
// Exposed protected methods in the render process.
contextBridge.exposeInMainWorld(
    // Allowed 'ipcRenderer' methods.
    'ipcRender', {
    // From render to main.
    send: (channel, args) => {
        let validChannels = ipc.render.send;
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, args);
        }
    },
    // From main to render.
    receive: (channel, listener) => {
        let validChannels = ipc.render.receive;
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`.
            ipcRenderer.on(channel, (event, args) => listener(args));
        }
    },
    // From render to main and back again.
    invoke: (channel, args) => {
        let validChannels = ipc.render.sendReceive;
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, args);
        }
    }
}
);