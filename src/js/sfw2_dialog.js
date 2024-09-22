import * as bootstrap from "bootstrap";
import $ from "jquery";
import {sfw2Reload} from "./sfw2_helper";

export function sfwShowCommonDialog(data) {
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

export function sfwShowFormDialog(button, title, buttonCaption) {
    const formId = button.data('sfw2-form-id');

    const sendButton = $('#sfw2-form-dialog-button-send');

    sendButton.html(buttonCaption);

    sendButton.data('sfw2-item-id', button.data('sfw2-item-id'));
    sendButton.data('sfw2-form-id', '#sfw2-form-dialog-body form');
    sendButton.data('sfw2-url', button.data('sfw2-url'));

    $('#sfw2-form-dialog-title').html(title);
    $('#sfw2-form-dialog-body').html($(formId).html());

    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();
}

export function sfwShowDeleteDialog(button, title, buttonCaption) {
    const itemId = button.data('sfw2-item-id');
    const formId = button.data('sfw2-form-id');

    const sendButton = $('#sfw2-form-dialog-button-send');

    sendButton.html(buttonCaption);

    $('#sfw2-form-dialog-title').html(title);

    const titleItem = $(formId + '_title_' + itemId);

    let caption = titleItem.text();
    if(!caption.length) {
        caption = titleItem.val();
    }

    caption = $.trim(caption);
    if(caption.length) {
        caption = '"' + caption + '"';
    }
    $('#sfw2-form-dialog-body').html(`Soll der Eintrag <strong>${caption}</strong> wirklich gelöscht werden?`);

    sendButton.data('sfw2-item-id', itemId);
    sendButton.data('sfw2-form-id', formId);
    sendButton.data('sfw2-url', button.data('sfw2-url'));

    const myModal = new bootstrap.Modal('#sfw2-form-dialog-modal', {});
    myModal.show();

}
