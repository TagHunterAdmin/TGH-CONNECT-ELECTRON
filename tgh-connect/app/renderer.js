'use strict';


var months = { 1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre" };


$(document).ready(function () {
  var serialscrolling = $('[data-serialscrolling]').serialscrolling();
  window.ipcRender.send('get_device_uniq', 'blop');
  window.ipcRender.send('get_config_data', 'blop');
  window.ipcRender.send('get_events_path', 'blop');

  $('#connect_button').click(function () {
    connectToGame();
  })

  $('.close').click(function (e) {
    var target = $(this).data('close-target');
    $('#' + target).hide();
  });

  $('#submit_user_email').click(function (e) {
    window.ipcRender.send('update_user_email', $('#user_email_form').val());
  });
  $('#save_device').click(function (e) {
    registerDevice();
  });



});

/*
*
* Config
*
**/
window.ipcRender.receive('response_update_user_email', (user_email) => {
  console.log(user_email);
  $('#user_email').val(user_email);
  showAlert('success', '', 'Identifiant mis à jour', 'success_update_email');
});

window.ipcRender.receive('events_path', (events_path) => {
  $('#events_path').val(events_path);
  $('#events_path_config').text(events_path);
});

window.ipcRender.receive('config_data', (config_data) => {
  $('#user_email_form').attr('placeholder', config_data);
  $('#user_email').val(config_data);

  if (config_data == '') {
    $('#config_link').click();
  } else {
    console.log(config_data);
    checkDeviceRegistration(config_data);
  }
});



/*
*
* Device
*
**/

window.ipcRender.receive('device_uniq', (data) => {
  $('#device_uniq').val(data);
  $('#device_uniq_span').text(data);
});

function registerDevice(){
  var data = {
    DateTime: Date.now(),
    clientLogin: $('#user_email').val(),
    device_uniq: $('#device_uniq').val(),
    deviceName: $('#device_name_input').val(),
  }
  console.log(data);
  sendHttpRequest('GET', 'http://localhost/', 'registerDevice', data, function (response) {
    console.log(response);
    if (response.status == 404|| response.status == 401) {
      showAlert('danger', 'Erreur ' + response.status, response.responseJSON, 'error_404');
    }else{
      $('#device_name_span').text(' ('+response+')');
      showAlert('success', '', response, 'success_update_email');
    }
  });
}

function checkDeviceRegistration(config_data) {
  var data = {
    DateTime: Date.now(),
    clientLogin: $('#user_email').val(),
    device_uniq: $('#device_uniq').val(),
    taghunter_connect_version: '2.0.0',
  }

  sendHttpRequest('GET', 'http://localhost/', 'checkDeviceRegistrationV2', data, function (response) {
    console.log(response);
    if (response.status == 404) {
      $('#config_link').click();
      showAlert('danger', 'Erreur ' + response.status, response.responseJSON, 'error_404');
    }else{
      $('#device_name_span').text(' ('+response+')');
    }
  });
}

/*
*
* Raw Data
*
**/
function handleCallbackSerialScrolling() {
  $('#raw_data .fa-spinner').show();
  $('#raw_data_folders').empty();
  window.ipcRender.send('get_raw_data_folders', 'blop');
}

window.ipcRender.receive('raw_data_folders', (data) => {
  console.log('raw_data_folders', data);
  $('#raw_data_folders').empty();
  $.each(data, function (index, folder_name) {
    $('#raw_data .fa-spinner').hide();
    $('#raw_data_folders').append('<div data-folder="' + folder_name + '" id="folder_' + folder_name + '" class="raw_data_folder">' + months[parseInt(folder_name)] + '</div>');
  });

  $('.raw_data_folder').click(function (e) {
    var folder_name = $(e.target).attr('data-folder');
    $('#folder_games').data('folder', folder_name);
    window.ipcRender.send('get_raw_data_single_folder', folder_name.toString());

  })
});

window.ipcRender.receive('raw_data_file', (raw_data_file) => {
  $('#file_game_content').empty();
  $('#file_game_content').append('<div>' + raw_data_file + '</div>');
  $('#file_game').show();

});

window.ipcRender.receive('raw_data_single_folder', (files) => {
  $('#folder_games_content').empty();
  $.each(files, function (index, file_name) {
    $('#folder_games_content').append('<div data-file="' + file_name + '" class="raw_data_file">' + file_name + '</div>');
    $('#folder_games').show();
  });

  $('.raw_data_file').click(function () {
    var file_name = $(this).data('file');
    var folder_name = $('#folder_games').data('folder');
    var file_path = folder_name + '/' + file_name;
    console.log('file_path', file_path);
    window.ipcRender.send('get_raw_data_file', file_path.toString());
  })
});

/*
*
* Launch Game
*
**/
function connectToGame() {
  $('#connect_button .fa-gamepad').hide();
  $('#connect_button .fa-spinner').show();


  var data = {
    DateTime: Date.now(),
    clientLogin: $('#user_email').val(),
    device_uniq: $('#device_uniq').val(),
    taghunter_connect_version: '2.0.0',
  }
  $('#loading_verbose').text('Vérification du poste...');
  // sendHttpRequest('GET', 'http://192.168.129.250/', 'checkDeviceRegistration', data, function (response) {
  sendHttpRequest('GET', 'http://localhost/', 'checkDeviceRegistrationV2', data, function (response) {

    console.log(response);
    if (response.status == 404) {
      $('#config_link').click();
      showAlert('danger', 'Erreur ' + response.status, response.responseJSON, 'error_404');
    } else {
      $('#loading_verbose').text('Recherche de jeu en cours...');

      var intervalCheckDeviceUsedInLaunchedGame = setInterval(function () {
        sendHttpRequest('GET', 'http://localhost/', 'checkDeviceUsedInLaunchedGameV2', data, function (response) {
          console.log('in intervalCheckDeviceUsedInLaunchedGame');
          console.log(response);
          clearInterval(intervalCheckDeviceUsedInLaunchedGame);
          if (response.status == 404) {
            showAlert('warning', '', response.responseJSON, 'error_404');
            $('#connect_button .fa-gamepad').show();
            $('#connect_button .fa-spinner').hide();
            $('#connect_button .fa-gamepad').removeClass('fa-beat-fade');
            $('#connect_button .fa-gamepad').removeClass('connected');
            $('#loading_verbose').text('');
          } else {
            clearInterval(intervalCheckDeviceUsedInLaunchedGame);

            var launched_game_title = response.split(' (')[0];
            var launched_game_id = response.split(":").pop();
            launched_game_id = launched_game_id.slice(0, -1);
            $('#launched_game_id').val(launched_game_id);
            $('#launched_game_title').val(launched_game_title);
            var data_create_launched_game_file = {
              launched_game_title: launched_game_title,
              launched_game_id: launched_game_id
            };
            window.ipcRender.send('create_launched_game_file', data_create_launched_game_file);
            $('#connect_button .fa-gamepad').show();
            $('#connect_button .fa-spinner').hide();
            $('#loading_verbose').text(response);
            $('#connect_button .fa-gamepad').addClass('fa-beat-fade');
            $('#connect_button .fa-gamepad').addClass('connected');


            var intervalCheckNewBip = setInterval(function () {
              checkNewBip();
            }, 1000);
          }
        });

      }, 5000);

    }
  });
}


window.ipcRender.receive('reply_check_new_bip', (new_bip) => {
  console.log('reply_check_new_bip', new_bip);
  if (new_bip) {
    var dataLastLine = {
      clientLogin: $('#user_email').val(),
      device_uniq: $('#device_uniq').val(),
      lastLine: new_bip,
      LaunchedGameId: $('#launched_game_id').val()
    }
    console.log('reply_check_new_bipdataLastLine', dataLastLine);
    sendHttpRequest('POST', 'http://localhost/', 'postLaunchedGameLastRowV2', dataLastLine, function (response) {
      console.log(response.status);
      console.log(response);
      if (response.status) {
        showAlert('danger', 'Erreur ' + response.status, response.responseJSON, 'error_404');
      } else {

      }

    });
  }
});

function checkNewBip() {

  var data_check_new_bip = {
    launched_game_id: $('#launched_game_id').val(),
    launched_game_title: $('#launched_game_title').val()
  };

  window.ipcRender.send('check_new_bip', data_check_new_bip);
}

/*
*
* Test WIFI
*
**/

let errors = {
  'no_wifi': false,
  'no_tgh': false,
  'tgh_network_disconnected': false,
};


window.ipcRender.receive('csv', (data) => {
  console.log(data);
});

window.ipcRender.receive('wifi_data', (data) => {

  if (data.type == 'no_wifi') {
    errors.no_wifi = true;
    showAlert('danger', 'Erreur Wifi', 'Le wifi est-il activé?', 'no_wifi')
    addErrorWifi();

  } else if (data.type == 'no_tgh') {
    errors.no_tgh = true;
    showAlert('danger', 'Erreur Wifi', 'Le réseau Tag Hunter ne semble pas exister. Le routeur est-il branché?', 'no_tgh')
    addErrorWifi();;

  } else if (data.type == 'tgh_network') {
    if (data.connection == "déconnecté") {
      errors.tgh_network_disconnected = true;
      showAlert('danger', 'Erreur Wifi', 'Le réseau Tag Hunter existe mais l\'ordinateur n\'y est pas connecté', 'tgh_network_disconnected')
      addErrorWifi();
    } else {

      var ssid = data.ssid;
      if (ssid) {
        if (ssid.includes('unter')) {
          if (data.connection == 'connecté') {
            $('#wifi_data_icon').addClass("connected");
            $("#wifi_data_verbose").text(data.signal);

            errors.no_wifi = false;
            errors.no_tgh = false;
            errors.tgh_network_disconnected = false;

            $.each(errors, function (slug, value) {
              $('#' + slug + '_alert').remove();
            })
            $('#wifi_data').removeClass('error');
          }
        }
      }
    }
  }



  // document.getElementById('detail-name').innerText = details;
})


function addErrorWifi() {
  $('#wifi_data').addClass('error');
  $('#wifi_data_icon').removeClass('connected');
  $('#wifi_data_verbose').text('');
}

/*
*
* Test Server
*
**/
setInterval(function () {
  checkServer();
}, 5000);


function sendHttpRequest(method, baseUrl, endpoint, data, callback) {
  var url = baseUrl + 'taghunter/public/api/' + endpoint;
  // url: 'http://192.168.129.250/taghunter/public/api/checkConnexion',
  let ajax_response = false;
  $.ajax({
    url: url,
    type: method,
    data: data,
    // contentType: 'application/json',
    headers: { "Authorization": "Bearer 80b44ea9c302237f9178a137d9e86deb-20083fb12d9579469f24afa80816066b" },
    success: callback,
    error: callback
  });
  return ajax_response;
}

function checkServer() {
  sendHttpRequest('GET', 'http://192.168.129.250/', 'checkConnexion', false, function (response) {

    if (response == 'connected') {
      $('#server_data').addClass("connected");
      $('#server_data').removeClass("error");
      if ($('#serveur_disconnected_alert').length) {
        $('#serveur_disconnected_alert').remove();
      }
    } else {
      showAlert('danger', 'Erreur Serveur', 'Le serveur n\'a pas été trouvé. Assurez-vous qu\'il est bien branché et connecté au routeur', 'serveur_disconnected')
      $('#server_data').removeClass("connected");
      $('#server_data').addClass("error");
    }
  });
}

/*
*
* Test Events
*
**/
window.ipcRender.receive('events_file', (data) => {
  console.log(data);
});



function showAlert(alert_type, alert_title, alert_message, alert_slug) {

  if ($('#' + alert_slug + '_alert').length == 0) {

    var html = '<div id="' + alert_slug + '_alert" class="alert alert-' + alert_type + '" role="alert">' +
      '<strong>' + alert_title + '</strong> ' + alert_message +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
      '</div>';

    $('#alerts').append(html);
  }

}

