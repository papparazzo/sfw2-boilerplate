import $ from "jquery";
import * as bootstrap from "bootstrap";

export function sfw2Load(url, data, form, totalFiles, fileCount) {
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
        /* FIXME Geht noch nicht!
        if(jqXHR.status !== 422 || !entries /* No entries && status 422 => ungültiges xsrf-token* /) {
            data.title = `[${data.title}] ${data.caption}`;
            data.identifier = `ID: ${data.identifier}`;
            data.reload = true;
            sfwShowCommonDialog(data);
            return;
        }*/

        if(!form) {
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

export function sfw2LoadContent(that, url) {
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

export function loadForm(url) {
    sfw2LoadContent($('#sfw2-form'), url);
    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();
}
