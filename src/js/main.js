import '../scss/styles.scss'

import lightbox from 'lightbox2'
lightbox;

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import * as bootstrap from 'bootstrap'

import $ from "jquery";

$(document).on('click', '.sfw2-load-form', function() {
    let url = $(this).data('sfw2-url');
    if(url.split('?').length === 1) {
        url += '?getForm'
    } else {
        url += '&getForm'
    }
    loadForm(url);
});

$(function(){
    const urlParams = new URLSearchParams(window.location.search);
    if(!urlParams.has('getForm')) {
        return;
    }
    loadForm(`${urlParams.get('getForm')}${window.location.search}`);
});

function loadForm(url) {
    sfw2LoadContent($('#sfw2-form'), url);
    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();
}

$('.sfw2-reload-content').each(function() {
    sfw2LoadContent($(this), $(this).data('sfw2-url'));
});

function sfw2Reload() {
    const url = new URL(window.location)
    url.searchParams.delete('getForm');
    url.searchParams.delete('hash');
    window.location.href = url.toString();
    window.location.reload();
}

$(document).on('keyup', 'input, textarea', function(e){
    $(this).removeClass('is-invalid');

    if($(this).hasClass('sfw2-submit-on-enter') && e.keyCode === 13) {
        $('#sfw2-form-dialog-button-send').trigger('click');
    }
});

$(document).on('click', 'input:checkbox', function(){
    $(this).removeClass('is-invalid');
});

function sfw2LoadContent(that, url) {
    that.append('<div class="text-center"><div class="sfw2-ajax-loader" /></div>');

    $.ajax({
        url: url,
        dataType: "html",
        headers : {
            "Content-Type":     "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "accept":           "application/xml"
        }
    }).done((data, textStatus, request) => {
        $('#sfw2-xsrf-token').val(request.getResponseHeader('x-csrf-token'));
        that.html($.parseHTML(data));
    }).fail((request) => {
        // FIXME: Ist hier wahrscheinlich immer null da Session-Middleware nicht richtig aufgerufen wird!
        $('#sfw2-xsrf-token').val(request.getResponseHeader('x-csrf-token'));
        that.html(
            '<div class="alert alert-danger" role="alert">' +
            '<strong>Anmerkung:</strong>' +
            '<p>Es ist ein interner Fehler aufgetreten!</p>' +
            '</div>'
        );
    });
}

$(document).on('click', '.sfw2-send-ajax-button', function(){
    const button = $(this);
    const title = button.data('sfw2-dialog-title');
    const caption = button.data('sfw2-dialog-button-caption');
    sfwShowFormDialog(button, title, caption);
});

$(document).on('click', '.sfw2-create-button', function(){
    sfwShowFormDialog($(this), 'Neuen Eintrag erstellen', 'Neuen Eintrag erstellen');
});

/* TODO: Create update!
$(document).on('click', '.sfw2-update-button', function() {
    ... daten Anfordern und Formular zuweisen
    const button = $(this);
    const itemId = button.data('sfw2-item-id');

    sfwShowFormDialog($(this), 'Eintrag bearbeiten', 'speichern');
});
 */

$(document).on('click', '.sfw2-delete-button', function(){
    const button = $(this);
    const itemId = button.data('sfw2-item-id');
    const formId = button.data('sfw2-form-id');

    const titleItem = $(formId + '_title_' + itemId);

    const sendButton = $('#sfw2-form-dialog-button-send');
    sendButton.html('Daten löschen');

    let title = titleItem.text();
    if(!title.length) {
        title = titleItem.val();
    }

    $('#sfw2-form-dialog-title').html('Eintrag löschen?');

    title = $.trim(title);
    if(title.length) {
        title = '"' + title + '"';
    }
    $('#sfw2-form-dialog-body').html(`Soll der Eintrag <strong>${title}</strong> wirklich gelöscht werden?`);

    sendButton.data('sfw2-item-id', itemId);
    sendButton.data('sfw2-form-id', formId);
    sendButton.data('sfw2-url', button.data('sfw2-url'));

    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();
});

function sfwShowFormDialog(button, title, buttonCaption) {
    const formId = button.data('sfw2-form-id');

    $('#sfw2-form-dialog-body').html($(formId).html());

    let sendButton = $('#sfw2-form-dialog-button-send');

    $('#sfw2-form-dialog-title').html(title);
    sendButton.html(buttonCaption);

    sendButton.data('sfw2-item-id', button.data('sfw2-item-id'));
    sendButton.data('sfw2-form-id', '#sfw2-form-dialog-body form');
    sendButton.data('sfw2-url', button.data('sfw2-url'));

    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();
}

document.getElementById('sfw2-form-dialog-modal').addEventListener('shown.bs.modal', event => {
     $("#sfw2-form-dialog-body input").first().focus();
})

function sfwShowCommonDialog(data) {
    if(bootstrap.Modal.getInstance('#sfw2-form-dialog-modal')) {
        bootstrap.Modal.getInstance('#sfw2-form-dialog-modal').hide();
    }

    if(data.identifier) {
        $('#sfw2-common-dialog-identifier').html(`[${data.identifier}]`);
    } else {
        $('#sfw2-common-dialog-identifier').html("");
    }
    $('#sfw2-common-dialog-title').html(data.title);
    $('#sfw2-common-dialog-body').html(data.description);

    if(data.reload) {
        $('#sfw2-common-dialog-button-okay').click(() => sfw2Reload());
    } else {
        $('#sfw2-common-dialog-button-okay').click();
    }

    const myModal = new bootstrap.Modal('#sfw2-common-dialog-modal', {});
    myModal.show();
}

window.onerror = function(message, source, lineno, error) {
    let response = {
        title: '[500] Interner Fehler aufgetreten!',
        description:
            'Es ist ein unbekannter Fehler aufgetreten. ' +
            'Bitte prüfe die URL auf Fehler und drücke dann\n' +
            'den reload-Button in deinem Browser.',
        identifier: message
    };
    sfwShowCommonDialog(response);
    console.log(source);
    console.log(lineno);
    console.log(error);
    //TODO Consider to send report via ajax
    return true;
};

$(document).on('click', '.sfw2-button-send', function(){
    const that = $(this);
    const itemId = that.data('sfw2-item-id');
    const formId = that.data('sfw2-form-id');
    const url = that.data('sfw2-url');

    let data = {};

    if($(formId)) {
        data = $(formId).serializeArray();
    }

    if(itemId !== '') {
        data.push({name : 'id', value : itemId});
    }

    let hasFileUpload = false;
    let f = $(`${formId} input:file`);
    let file = null;
    if(f.length && typeof f.data('sfw2-onlyimage') !== 'undefined') {
        let hasErrors = false;
        let onlyImage = f.data('sfw2-onlyimage');

        if($(f).prop('required') && f.val() === '') {
            f.addClass('is-invalid');
            f.next().html('Es wurde keine Datei ausgewählt');
            hasErrors = true;
        } else {
            f.removeClass('is-invalid');
        }

        if(!hasErrors) {
            file = f[0].files[0];
            if(onlyImage && !file.type.match(/^image\//)){
                f.addClass('is-invalid');
                f.next().html('Es wurde kein gültiges Bild ausgewählt');
            } else {
                f.removeClass('is-invalid');
            }
        }
        data.push({name: 'validateOnly', value : true});
        hasFileUpload = true;
    }

    sfw2Load(url, data, formId, 0).done(
        (response, textStatus, jqXHR) => {
            $('#sfw2-xsrf-token').val(jqXHR.getResponseHeader('x-csrf-token'));

            if(response.title && response.description) {
                sfwShowCommonDialog(response);
                return;
            }

            if(file === null) {
                // FIXME think about reloading
                sfw2Reload();
                return;
            }

            let reader = new FileReader();
            reader.onload = function(evt) {
                data.pop();
                data.push({name: 'file', value : reader.result});
                data.push({name: 'name', value : file.name});
                file = null;
                sfw2Load(url, data, formId, 1).done(
                    // FIXME Das hier ist noch nicht gut!
                    (response, textStatus, jqXHR) => {
                        sfw2Reload();
                    }
                );
            };
            reader.readAsDataURL(file);
        }
    );
});

function sfw2Load(url, data, form, totalFiles, fileCount) {
    $("#sfw2-progress-bar").css('width', 0);
    return $.ajax({
        type: "POST",
        url: url,
        data: data,
        headers : {
            "X-CSRF-Token": $('#sfw2-xsrf-token').val(),
            "X-Requested-With": "XMLHttpRequest",
            "accept":           "application/json"
        },

        xhr: function() {
            let xhr = new window.XMLHttpRequest();
            if(totalFiles === 0) {
                return xhr;
            }
            xhr.upload.addEventListener(
                "progress",
                function(evt) {
                    if (!evt.lengthComputable) {
                        return;
                    }
                    let percentComplete = evt.loaded / evt.total;
                    percentComplete = parseInt(percentComplete * 100);

                    // TODO: use class instead of id
                    $("#sfw2-progress-bar").css('width', percentComplete + '%');
                    if(totalFiles > 1) {
                        // TODO: use class instead of id
                        $("#sfw2-progress-bar-total").css(
                            'width',
                            (((totalFiles - fileCount - 1) / totalFiles) * 100) + (percentComplete / (totalFiles)) + '%').text('[Datei ' + (totalFiles - fileCount) + ' von ' + totalFiles + ']');
                    }
                },
                false
            );
            return xhr;
        }
    }).fail((jqXHR) => {
        $('#sfw2-xsrf-token').val(jqXHR.getResponseHeader('x-csrf-token'));

        let data = jqXHR.responseJSON;

        let entries = data.sfw2_payload;

        if(jqXHR.status !== 422 || !entries /* No entries && status 422 => ungültiges xsrf-token*/) {
            data.title = `[${data.title}] ${data.caption}`;
            data.identifier = `ID: ${data.identifier}`;
            data.reload = true;
            sfwShowCommonDialog(data);
            return;
        }
        for(let key in entries) {
            let item = $(form).find('[name=' + key + ']');

            if(entries[key].hint) {
                item.addClass('is-invalid');
                item.nextAll('.invalid-feedback:first').html(entries[key].hint);
            } else {
                item.removeClass('is-invalid');
            }
        }
    });
}

$(document).on('click', '.sfw2-btn-upload', function() {
    const that = $(this);

    const url = that.data('sfw2-url');
    const galleryId = that.data('sfw2-gallery-id');
    const formId = that.data('sfw2-form-id');

    let ftag = $(formId);

    let f = ftag[0].files;
    let files = [];

    /**
     *     if($(f).prop('required') && f.val() === '') {
     *         f.addClass('is-invalid');
     *         f.next().html('Es wurde keine Datei ausgewählt');
     *         return;
     *     } else {
     *         f.removeClass('is-invalid');
     *     }
     */

    for(let i = 0; i < f.length; i++) {
        let len = files.length;
        let y = 0;
        let found = false;
        for(; y < len; y++){
            if(files[y].name === f[i].name && files[y].type === f[i].type && files[y].size === f[i].size) {
                found = true;
                break;
            }
        }

        if(!f[i].type.match(/^image\//) || found){
            continue;
        }

        files.push(f[i]);
    }

    if(!files.length) {

        let response = {
            title: 'Es wurden keine gültigen Bilder ausgewählt',
            description:
                'Es wurden entweder gar keine Bilder ausgewählt oder die ausgewählten Dateien sind keine gültigen Bilddateien! ' +
                'Bitte prüfe deine Auswahl und versuche es erneut!'
        };
        sfwShowCommonDialog(response);
        return;
    }
/*
    if(!hasErrors) {
        file = f[0].files[0];
        if(onlyImage && !file.type.match(/^image\//)){
            f.addClass('is-invalid');
            f.next().html('Es wurde kein gültiges Bild ausgewählt');
        } else {
            f.removeClass('is-invalid');
        }
    }
*/
    const fcount = files.length;

    // FIXME Das hier ist noch nicht gut!
    let uploadFile = (file) => {
        let reader = new FileReader();
        reader.onload = function(evt) {
            let data = {gallery : galleryId, file : reader.result, name : file.name};
            sfw2Load(url, data, formId, fcount, files.length).done(
                (response, textStatus, jqXHR) => {
                    $('#sfw2-xsrf-token').val(jqXHR.getResponseHeader('x-csrf-token'));
                    if(files.length) {
                        uploadFile(files.pop());
                        return;
                    }
                    sfw2Reload();
                }
            );
        };
        reader.readAsDataURL(file);
    }
    uploadFile(files.pop());
});




/*
var inputFiles = document.getElementsByTagName("input")[0];
inputFiles.onchange = function(){
  var promise = Promise.resolve();
  inputFiles.files.map( file => promise.then(()=> pFileReader(file)));
  promise.then(() => console.log('all done...'));
}

function pFileReader(file){
  return new Promise((resolve, reject) => {
    var fr = new FileReader();
    fr.onload = resolve;  // CHANGE to whatever function you want which would eventually call resolve
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function readFile(file){
  return new Promise((resolve, reject) => {
    var fr = new FileReader();
    fr.onload = () => {
      resolve(fr.result )
    };
    fr.onerror = reject;
    fr.readAsText(file.blob);
  });
}
*/