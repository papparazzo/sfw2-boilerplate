"use strict"

import {sfwShowCommonDialog, sfwShowFormDialog} from './sfw2_dialog'
import {loadForm, sfw2Load, sfw2LoadContent} from "./sfw2_loader";

import * as bootstrap from 'bootstrap'

import $ from "jquery";
import {sfw2Reload} from "./sfw2_helper";

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

$('.sfw2-reload-content').each(function() {
    sfw2LoadContent($(this), $(this).data('sfw2-url'));
});

$(document).on('keyup', 'input, textarea', function(e){
    $(this).removeClass('is-invalid');

    if($(this).hasClass('sfw2-submit-on-enter') && e.keyCode === 13) {
        $('#sfw2-form-dialog-button-send').trigger('click');
    }
});

$(document).on('click', 'input:checkbox', function(){
    $(this).removeClass('is-invalid');
});

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

document.getElementById('sfw2-form-dialog-modal').addEventListener('shown.bs.modal', event => {
     $("#sfw2-form-dialog-body input").first().focus();
})

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

    $(`${formId} .sfw2-data-container`).each(function() {
        let val = [];
        $(this).find('span').each(function() {
            val.push($(this).data('sfw2-element-id'));
        })
        data.push({name : this.id, value : val});
    });

    if(itemId !== '') {
        data.push({name : 'id', value : itemId});
    }

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
            reader.onload = function() {
                data.pop();
                data.push({name: 'file', value : reader.result});
                data.push({name: 'name', value : file.name});
                file = null;
                sfw2Load(url, data, formId, 1).done(
                    // FIXME Das hier ist noch nicht gut!
                    () => {
                        sfw2Reload();
                    }
                );
            };
            reader.readAsDataURL(file);
        }
    );
});

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
        reader.onload = function() {
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
    var fileReader = new FileReader();
    fileReader.onload = resolve;  // CHANGE to whatever function you want which would eventually call resolve
    fileReader.onerror = reject;
    fileReader.readAsDataURL(file);
  });
}

function readFile(file){
  return new Promise((resolve, reject) => {
    let fileReader = new FileReader();
    fileReader.onload = () => {
      resolve(fr.result )
    };
    fileReader.onerror = reject;
    fileReader.readAsText(file.blob);
  });
}
*/
