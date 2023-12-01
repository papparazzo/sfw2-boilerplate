import '../scss/styles.scss'

import lightbox from 'lightbox2'
lightbox;

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import * as bootstrap from 'bootstrap'

import $ from "jquery";

$('.sfw2-reload-content').each(function() {
    loadContent($(this));
});

function loadContent(that) {
    that.append('<div class="text-center"><div class="sfw2-ajax-loader" /></div>');

    $.ajax({
        url: that.data('sfw2-url'),
        dataType: "html",
        headers : {
            "Content-Type":     "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "accept":           "application/xml"
        }
    }).done(function(data) {
        that.html($.parseHTML(data));
    }).fail(function(){
        printError(that);
    });
}

function printError(that) {
    printMsg(that, 'Es ist ein interner Fehler aufgetreten!', 'danger');
}

function printMsg(that, msg, type) {
    msg =
        '<div class="alert alert-' + type + '" role="alert">' +
        '<strong>Anmerkung:</strong>' +
        '<p>' + msg + '</p>' +
        '</div>';

    that.html(msg);
}

document.getElementById('sfw2-form-dialog-modal').addEventListener('show.bs.modal', function(event)  {

    let button = $(event.relatedTarget);
    let itemId = button.data('sfw2-item-id');
    let formId = button.data('sfw2-form-id');

    // FIXME: id ist dann doppelt vergeben!
    $('#dialogBody').html($('#' + formId).html());

    if(itemId) {
        /* TODO: Revisit
        $('#dialogTitle').html('Eintrag bearbeiten...');
        $('#createForm').each(function() {
            $(this).find(':input').each(function() {
                let name = '';
                if(typeof $(this).attr("name") === "undefined") {
                    name = $(this).data('name')
                } else {
                    name = $(this).attr("name");
                }

                let idx = '#' + formId + '_' + name  + '_' + itemId;
                if($(this).is('select')) {
                    $(this).find('option').filter(function() {
                        return this.text === $(idx).html();
                    }).attr('selected', true);
                } else {
                    $(this).val($(idx).html());
                }
            });
        });
        */
    } else {
        $('#dialogTitle').html('Neuen Eintrag erstellen...');
    }
/* TODO Revisit
    $('#createForm').find('textarea').each(function() {
        if($(this).attr('id')) {
            ClassicEditor.create(
                document.querySelector('#' + $(this).attr('id')),
                {
                    simpleUpload: {
                        uploadUrl: button.data('url') + '?do=addImage'
                    }
                }
            ).then( newEditor => { editor = newEditor;
            }).catch(error => {
                console.error(error);
            });
        }
    });

    let that = button.parents('thead');
    if(!that.length) {
        that = button;
    }
*/
    let sendButton = $('#sfw2-dialog-button-send');

 //   sendButton.data('target', that.next());
    sendButton.data('sfw2-item-id', itemId ? itemId : 0);
    sendButton.data('sfw2-form-id', formId);
    sendButton.data('sfw2-url', button.data('sfw2-url'));
    sendButton.data('sfw2-inline', false);
});

$(document).on('click', '.sfw2-button-send', function(e){
    let that = $(this);

    let formData;
    let form;

    if(that.data('sfw2-inline')) {
        form = $('#' + that.data('sfw2-form-id'));
    } else {
        form = $('#dialogBody form');
    }

    formData = form.serializeArray();
    formData.push({name : 'xss', value : $('#sfw2_xss_token').val()});

    /*
    let f = $("#createForm input:file");
    if(f.length && typeof f.data('onlyimage') !== 'undefined') {
        let onlyImage = f.data('onlyimage');
        uploadNewsPaper(f, formData, that, onlyImage);
        return;
    }
*/
    let itemId = that.data('sfw2-item-id');

    if(itemId > 0) {
        formData.push({name : 'id', value : itemId});
    }
/*
    $('#createForm').find('textarea').each(function() {
        if($(this).attr('id')) {
            formData.push({
                name : $(this).data('name'),
                value : editor.getData()
            });
        }
    });
    */
    $.ajax({
        type: "POST",
        url:  that.data('sfw2-url') + '?do=' + (itemId > 0 ? 'update' : 'create'),
        data: formData,
        //dataType: "json",
        headers : {
            "X-Requested-With": "XMLHttpRequest",
            "accept":           "application/json"
        },
        success: function(response) {
            $('#sfw2_xss_token').val(response.xss);
            let entries = response.data;

            for(let key in entries) {
                entries[key] = entries[key].value;
            }

            $('.is-invalid').removeClass('is-invalid').nextAll('.invalid-feedback:first').val('');
            /*
           // if(Handlebars.templates === undefined) {
                $('#createDialogModal').modal('hide');
                return;
           // }

            let template = Handlebars.templates[response.template];

            entries.url = that.data('url'); // FIXME rename into action url
            entries.deleteAllowed = false;
            if(response.permission.DELETE_ALL || response.permission.DELETE_OWN) {
                entries.deleteAllowed = true;
            }
            entries.updateAllowed = false;
            if(response.permission.UPDATE_ALL || response.permission.UPDATE_OWN) {
                entries.updateAllowed = true;
            }

            entries.formid = response.id;
            let html = template(response.data);

            if(itemId > 0) {
                const curItem = $('#' + formId + '_recordset_' + itemId);
                curItem.fadeOut(1250, function() {curItem.replaceWith(html).fadeIn(1250);});
            } else {
                let target = that.data('target');
                target.children('.empty-row').fadeOut(1250);
                $(html).hide().prependTo(target).fadeIn(1250);
                let offset = +target.data('offset') || 0;
                target.data('offset', ++offset);
            }*/
            /*
            if(bootstrap.Modal.getInstance('#sfw2-form-dialog-modal')){
                bootstrap.Modal.getInstance('#sfw2-form-dialog-modal').hide();
            }

             */
            location.reload();
        },
        error: function(response) {
            if(response.status !== 422) {
                if(bootstrap.Modal.getInstance('#sfw2-form-dialog-modal')){
                    bootstrap.Modal.getInstance('#sfw2-form-dialog-modal').hide();
                }
                showErrorDialog(response.responseJSON);
            }

            let entries = response.responseJSON.sfw2_payload;

            for(let key in entries) {
                let item = form.find('[name=' + key + ']'); // FIXME: Hier nur Formelement im Modal-Dialog durchsuchen -> item.length ist hier 2!!!

                if(item.length === 0) {
                    // FIXME Spezialfall TextArea mit CKEditor: // border color = #dc3545
                    //       Aktuell kein roter Rahmen wenn leer und kein Hinweistext!!!
                    //
                    //if(entries[key].hint) {
                    //    item.addClass('is-invalid');
                    //    item.nextAll('.invalid-feedback:first').html(entries[key].hint);
                    //} else {
                    //    item.removeClass('is-invalid');
                    //}
                } else {
                    if(entries[key].hint) {
                        item.addClass('is-invalid');
                        item.nextAll('.invalid-feedback:first').html(entries[key].hint);
                    } else {
                        item.removeClass('is-invalid');
                    }
                }
            }
        }
    });
});

//sfw2-login-logout-button


function showErrorDialog(response) {
    //$('#sfw2_xss_token').val(response.xss); FIXME: add xssToken
    $('#sfw2-common-dialog-title').html(`[${response.title}] ${response.caption}`);
    $('#sfw2-common-dialog-body').html(response.description);
    $('#errorDialogId').html(`[ID: ${response.identifier}]`);

    const myModal = new bootstrap.Modal('#sfw2-common-dialog-modal', {});
    myModal.show();
}

function showError(title, message) {
    document.getElementById('dialogTitle').innerText = title;
    document.getElementById('dialogBody').innerHTML = message;

    const myModalAlternative = new bootstrap.Modal('#editDialogModal');
    myModalAlternative.show();
}

/*
$('a, input:button, button').each(function() {
    $(this).focus(function() {
        if(this.blur) {
            this.blur();
        }
    });
});
*/








/*

$('#deleteDialogModal').on('show.bs.modal', function (event) {
    const button = $(event.relatedTarget);
    const itemId = button.data('item-id');
    const formId = button.data('form-id');
    const delUrl = button.data('url');
    const modal = $(this);

    const titleItem = $('#' + formId + '_title_' + itemId);

    $('#deleteDialogAcceptButton').data('item-id', itemId);
    $('#deleteDialogAcceptButton').data('form-id', formId);
    $('#deleteDialogAcceptButton').data('del-url', delUrl);
    $('#deleteDialogAcceptButton').data('target', button.closest('.reload-data'));

    let title = titleItem.text();
    if(!title.length) {
        title = titleItem.val();
    }

    title = $.trim(title);
    if(title.length) {
        title = '"' + title + '"';
    }

    modal.find('.modal-content-title').text(title);
});

$('#deleteDialogAcceptButton').click(function() {
    const that = $(this);
    const itemId = that.data('item-id');
    const formId = that.data('form-id');
    const url = that.data('del-url');
    const target = that.data('target');

    $.ajax({
        type: "POST",
        url:  url + '?do=delete',
        dataType: "json",
        data: {
            id: itemId,
            xss: $('#sfw2_xss_token').val()
        },
        success: function(response) {
            let id = itemId.toString().replace(".", "_");

            if(response.reload) {
                window.location.reload();
                return;
            }
            $('#sfw2_xss_token').val(response.xss);
            $('#deleteDialogModal').modal('hide');
            $('#' + formId + '_recordset_' + id).fadeOut(1250, function() {$(this).remove();});
            loadEntries(target, url, 1);
        },
        error: function(response) {
            $('#deleteDialogModal').modal('hide');
            showErrorDialog(response.responseJSON);
        }
    });
});

 */