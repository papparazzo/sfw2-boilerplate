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

//$('#sfw2-dialog-modal').on('show.bs.modal', function (event) {
document.getElementById('sfw2-dialog-modal').addEventListener('show.bs.modal', function(event)  {

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
    sendButton.data('sfw2-itemId', itemId ? itemId : 0);
    sendButton.data('sfw2-formId', formId);
    sendButton.data('sfw2-url', button.data('sfw2-url'));
});

//$('#sfw2-dialog-button-send').

$(document).on('click', '.sfw2-contact-button-send', function(e){
    let that = $(this);

    let formData;
    //if($('#dialogBody form')) {
    //    formData = $('#dialogBody form').serializeArray();
    //} else {
        formData = $('#' + that.data('sfw2-form-id')).serializeArray();
    //}

    formData.push({name : 'xss', value : $('#xssToken').val()});



    /*
    let f = $("#createForm input:file");
    if(f.length && typeof f.data('onlyimage') !== 'undefined') {
        let onlyImage = f.data('onlyimage');
        uploadNewsPaper(f, formData, that, onlyImage);
        return;
    }
*/
    let itemId = that.data('sfw2-itemId');
    let formId = that.data('sfw2-formId');

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
            $('#xssToken').val(response.xss);
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
            if(bootstrap.Modal.getInstance('#sfw2-dialog-modal')){
                bootstrap.Modal.getInstance('#sfw2-dialog-modal').hide();
            }
        },
        error: function(response) {
            if(response.status !== 422) {
                if(bootstrap.Modal.getInstance('#sfw2-dialog-modal')){
                    bootstrap.Modal.getInstance('#sfw2-dialog-modal').hide();
                }
                showErrorDialog(response.responseJSON);
            }

            // FIXME Unterscheiden zwischen Dialog und inline
            //let elems = $('#dialogBody');
            let elems = $('#p__kontakt');

            let entries = response.responseJSON.sfw2_payload;

            for(let key in entries) {
                let item = elems.find('[name=' + key + ']'); // FIXME: Hier nur Formelement im Modal-Dialog durchsuchen -> item.length ist hier 2!!!

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

function showErrorDialog(response) {
    //$('#xssToken').val(response.xss); FIXME: add xssToken
    $('#sfw2-common-dialog-title').html(`[${response.title}] ${response.caption}`);
    $('#sfw2-common-dialog-body').html(response.description);
    $('#errorDialogId').html(`[ID: ${response.identifier}]`);

    const myModal = new bootstrap.Modal('#sfw2-common-dialog-modal', {});
    myModal.show();
}


/*

document.getElementById('editDialogModal').addEventListener('show.bs.modal', function(event)  {
    const button = event.relatedTarget;
    const formId = button.dataset.sfw2FormId;

    document.getElementById('dialogBody').innerHTML = document.getElementById(formId).innerHTML;

    document.getElementById('dialogButton').addEventListener('click', function(){
            let that = this;
            const url =  that.dataset.sfw2Url;

            let form = document.getElementById('dialogBody').firstChild;

            while((form = form.nextSibling)) {
                if(form.nodeType === 1) {
                    break;
                }
            }

            let formData = new FormData(form);

        formData.append('xss', document.getElementById('xssToken').value);

    const values = Object.fromEntries(formData.entries());

    try {
        fetch(
            '/gaestebuch?do=create',
            {
                method: "POST", // or 'PUT'
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "accept": "application/json"
                },
                body: JSON.stringify(values),
            }
        ).then(
            r => r.json().then(data => ({status: r.status, body: data}))
        ).then(function (obj) {
            let data = obj.body;
            for(let key in data) {
                let item = form.elements[key];
                if(!item) {
                    continue;
                }

                if(item.length !== 0) {
                    if(data[key].hint) {
                        item.classList.add('is-invalid');
                        let e = item;
                        while((e = e.nextSibling)) {
                            if(e.nodeType === 1 && e.classList.contains('invalid-feedback')) {
                                e.innerHTML = data[key].hint;
                                break;
                            }
                        }
                    } else {
                        item.classList.remove('is-invalid');
                    }
                }
            }
            if(obj.status >= 500) {
                // TODO: Fehler!
                return;
            }

            if(obj.status === 422) {
                return;
            }

            that.classList.add('d-none');
            //document.getElementById(id + '_send_notification').classList.remove('d-none')

            //that.disabled = false;
        });
    } catch (error) {
        that.disabled = false;
        console.error("Error:", error);
    }
    });

    //$('#createForm').html($('#' + formId).html());

    //const myInput = document.getElementById('myInput')
    //myInput.focus()

    //let itemId = button.data('item-id');
    document.getElementById('dialogTitle').innerText = 'Neuen Eintrag erstellen...';
});



/*


$('#createDialogModal').on('show.bs.modal', function (event) {
    let button = $(event.relatedTarget);
    let itemId = button.data('item-id');
    let formId = button.data('form-id');

    $('#createForm').html($('#' + formId).html());

    if(itemId) {
        $('#editTitle').html('Eintrag bearbeiten...');
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
    } else {
        $('#editTitle').html('Neuen Eintrag erstellen...');
    }

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

    $('#createDialogSaveButton').data('target', that.next());
    $('#createDialogSaveButton').data('itemId', itemId ? itemId : 0);
    $('#createDialogSaveButton').data('formId', formId);
    $('#createDialogSaveButton').data('url', button.data('url'));
});
*/

function showError(title, message) {
    document.getElementById('dialogTitle').innerText = title;
    document.getElementById('dialogBody').innerHTML = message;

    const myModalAlternative = new bootstrap.Modal('#editDialogModal');
    myModalAlternative.show();
}
