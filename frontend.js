$(function () {
    "use strict";

    window.chatwoot = {};
    chatwoot.inboxIdentifier = "QjaHRsgY1SRz85VcnU3MpzUS";
    chatwoot.chatwootAPIUrl = "https://chat.spi.uz/public/api/v1/";

    var content = $('#content');
    var input = $('#input');
    var status = $('#status');

    window.WebSocket = window.WebSocket || window.MozWebSocket;
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    var connection = new WebSocket('wss://chat.spi.uz/cable');

    connection.onopen = async function () {
        await setUpContact();
        await setUpConversation();
        connection.send(JSON.stringify({ command: "subscribe", identifier: JSON.stringify({ channel: "RoomChannel", pubsub_token: chatwoot.contactPubsubToken }) }));
        input.removeAttr('disabled');
        status.text('Send Message:');
    };

    connection.onerror = function () {
        content.html($('<p>', { text: 'Connection error or server is down.' }));
    };

    connection.onmessage = function (message) {
        try {
            let json = JSON.parse(message.data);
            if (json.type === 'message' && json.message.event === 'message.created') {
                if (json.message.data.message_type === 1) {
                    addMessage(json.message.data.sender.name, json.message.data.content);
                }
            }
        } catch (e) {
            console.log('Invalid JSON:', message.data);
        }
    };

    input.keydown(function (e) {
        if (e.keyCode === 13) {
            let msg = $(this).val();
            if (!msg) return;
            sendMessage(msg);
            addMessage("me", msg);
            $(this).val('');
        }
    });

    setInterval(function () {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to communicate with the WebSocket server.');
        }
    }, 3000);

    function addMessage(author, message) {
        content.append('<p><span>' + author + '</span>: ' + message + '</p>');
        content.scrollTop(1000000);
    }

    async function setUpContact() {
        if (getCookie('contactIdentifier')) {
            chatwoot.contactIdentifier = getCookie('contactIdentifier');
            chatwoot.contactPubsubToken = getCookie('contactPubsubToken');
        } else {
            let response = await fetch(`${chatwoot.chatwootAPIUrl}inboxes/${chatwoot.inboxIdentifier}/contacts`, { method: 'POST' });
            let data = await response.json();
            chatwoot.contactIdentifier = data.source_id;
            chatwoot.contactPubsubToken = data.pubsub_token;
            setCookie('contactIdentifier', chatwoot.contactIdentifier, 30);
            setCookie('contactPubsubToken', chatwoot.contactPubsubToken, 30);
        }
    }

    async function setUpConversation() {
        if (getCookie('contactConversation')) {
            chatwoot.contactConversation = getCookie('contactConversation');
        } else {
            let response = await fetch(`${chatwoot.chatwootAPIUrl}inboxes/${chatwoot.inboxIdentifier}/contacts/${chatwoot.contactIdentifier}/conversations`, { method: 'POST' });
            let data = await response.json();
            chatwoot.contactConversation = data.id;
            setCookie('contactConversation', chatwoot.contactConversation, 30);
        }
    }

    async function sendMessage(msg) {
        await fetch(`${chatwoot.chatwootAPIUrl}inboxes/${chatwoot.inboxIdentifier}/contacts/${chatwoot.contactIdentifier}/conversations/${chatwoot.contactConversation}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': 'ТВОЙ_ТОКЕН'
            },
            body: JSON.stringify({ content: msg })
        });
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        let nameEQ = name + "=";
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
    }

    function eraseCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
});
