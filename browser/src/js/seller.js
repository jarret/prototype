// Copyright (c) 2020 Jarret Dyrbye
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const DomUtl = require('./ui/domutl.js').DomUtl;
const Uuid = require('./moneysocket/utl/uuid.js').Uuid;
const Bolt11 = require('./moneysocket/utl/bolt11.js').Bolt11;

const Timestamp = require('./moneysocket/utl/timestamp.js').Timestamp;
const WebsocketInterconnect = require(
    './moneysocket/socket/websocket.js').WebsocketInterconnect;
const WebsocketLocation = require(
    './moneysocket/beacon/location/websocket.js').WebsocketLocation;

const ConnectUi = require('./ui/connect.js').ConnectUi;
const SellerConnectUi = require('./seller/connect_ui.js').SellerConnectUi;
const ConsumerStack = require("./moneysocket/stack/consumer.js").ConsumerStack;
const SellerStack = require("./seller/stack.js").SellerStack;

const SellerUi = require('./seller/ui.js').SellerUi;


class SellerApp {
    constructor() {
        this.parent_div = document.getElementById("ui");
        this.my_div = document.createElement("div");
        this.my_div.setAttribute("class", "bordered");

        this.seller_app_ui = new SellerUi(this.my_div, this);

        this.seller_stack = this.setupSellerStack();
        this.consumer_stack = this.setupConsumerStack();

        this.seller_ui = new SellerConnectUi(this.my_div, "Seller App Provider",
                                             this.seller_stack);
        this.consumer_ui = new ConnectUi(this.my_div, "Seller Wallet Consumer",
                                         this.consumer_stack);
        this.account_uuid = Uuid.uuidv4();
        this.provider_info = {'ready': false};

        this.seller_uuid = Uuid.uuidv4();
        this.store_open = false;

        this.requested_items = {};
        this.payment_hash_items = {};

        this.seller_wad = null;
    }

    setupSellerStack() {
        var s = new SellerStack();
        s.onnexusonline = (function(nexus) {
            this.sellerOnNexusOnline(nexus);
        }).bind(this);
        s.onnexusoffline = (function(nexus) {
            this.sellerOnNexusOffline(nexus);
        }).bind(this);
        s.onstackevent = (function(layer_name, nexus, status) {
            this.sellerOnStackEvent(layer_name, nexus, status);
        }).bind(this);
        s.handleopinioninvoicerequest = (
            function(item_id, request_reference_uuid) {
                return this.handleOpinionInvoiceRequest(item_id,
                                                        request_reference_uuid);
            }).bind(this);
        s.handlesellerinforequest = (function(item_id, request_reference_uuid) {
            return this.handleSellerInfoRequest();
        }).bind(this);
        s.handleproviderinforequest = (function() {
            return this.handleProviderInfoRequest();
        }).bind(this);
        return s;
    }

    setupConsumerStack() {
        var s = new ConsumerStack();
        s.onnexusonline = (function(nexus) {
            this.consumerOnNexusOnline(nexus);
        }).bind(this);
        s.onnexusoffline = (function(nexus) {
            this.consumerOnNexusOffline(nexus);
        }).bind(this);
        s.onproviderinfo = (function(provider_info) {
            this.consumerOnProviderInfo(provider_info);
        }).bind(this);
        s.onstackevent = (function(layer_name, nexus, status) {
            this.consumerOnStackEvent(layer_name, nexus, status);
        }).bind(this);
        s.onping = (function(msecs) {
            this.consumerOnPing(msecs);
        }).bind(this);
        s.onbolt11 = (function(bolt11, request_reference_uuid) {
            this.consumerOnBolt11(bolt11, request_reference_uuid);
        }).bind(this);
        s.onpreimage = (function(preimage, request_reference_uuid) {
            this.consumerOnPreimage(preimage, request_reference_uuid);
        }).bind(this);
        return s;
    }

    drawSellerUi() {
        DomUtl.drawTitle(this.my_div, "Opinion Seller App", "h2");

        this.seller_app_ui.draw("center");
        DomUtl.drawBr(this.my_div);

        this.consumer_ui.draw("left");
        this.seller_ui.draw("right");

        DomUtl.drawBr(this.my_div);
        DomUtl.drawBr(this.my_div);
        this.parent_div.appendChild(this.my_div);
    }


    ///////////////////////////////////////////////////////////////////////////
    // Seller
    ///////////////////////////////////////////////////////////////////////////

    openStore() {
        //console.log("h: " + this.seller_app_ui.hello_price +
        //            " t: " + this.seller_app_ui.time_price +
        //            " o: " + this.seller_app_ui.opinion_price);
        //this.getHelloMsatPrice();
        //this.getTimeMsatPrice();
        //this.getOpinionMsatPrice();
        this.store_open = true;
        this.seller_stack.sellerNowReadyFromApp();
    }

    closeStore() {
        this.store_open = false;
        this.seller_stack.doDisconnect();
    }

    updatePrices() {
        //this.getHelloMsatPrice();
        //this.getTimeMsatPrice();
        //this.getOpinionMsatPrice();
        this.seller_stack.updatePrices();
    }

    getItem(item_id) {
        if (item_id == 'hello') {
            return "Sincere Hello!!";
        } else if (item_id == "time") {
            return Timestamp.getNowTimestamp().toString();
        } else if (item_id == "outlook") {
            return this.seller_app_ui.getCurrentOpinion();
        } else {
            return "";
        }
    }

    getHelloMsatPrice() {
        if (this.seller_wad == null) {
            return null;
        }
        var set_price = this.seller_app_ui.hello_price;
        var rate = this.seller_wad.getDefactoRate();
        var [btc, code] = rate.convert(set_price, this.seller_wad['code']);
        //console.log("hello btc: " +  btc);
        var msats = Math.round(btc * (100000000.0 * 1000.0));
        console.log("hello msats: " +  msats);
        return msats;
    }

    getTimeMsatPrice() {
        if (this.seller_wad == null) {
            return null;
        }
        var set_price = this.seller_app_ui.time_price;
        var rate = this.seller_wad.getDefactoRate();
        var [btc, code] = rate.convert(set_price, this.seller_wad['code']);
        //console.log("time btc: " +  btc);
        var msats = Math.round(btc * (100000000.0 * 1000.0));
        console.log("time msats: " +  msats);
        return msats;
    }

    getOpinionMsatPrice() {
        if (this.seller_wad == null) {
            return null;
        }
        var set_price = this.seller_app_ui.opinion_price;
        var rate = this.seller_wad.getDefactoRate();
        var [btc, code] = rate.convert(set_price, this.seller_wad['code']);
        //console.log("opinion btc: " +  btc);
        var msats = Math.round(btc * (100000000.0 * 1000.0));
        console.log("opinion msats: " +  msats);
        return msats;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Consumer Stack Callbacks
    ///////////////////////////////////////////////////////////////////////////

    consumerOnNexusOnline(nexus) {
        this.seller_app_ui.consumerOnline();
    }

    consumerOnNexusOffline(nexus) {
        this.seller_wad = null;
        this.provider_info = {'ready': false};
        this.seller_app_ui.consumerOffline();
        this.seller_stack.doDisconnect();
    }

    consumerOnProviderInfo(provider_info) {
        var was_ready = this.provider_info['ready'];
        this.seller_wad = provider_info['wad'];
        this.provider_info = {'ready':        true,
                              'payer':        false,
                              'payee':        true,
                              'wad':          null,
                              'account_uuid': this.account_uuid};
        this.seller_app_ui.balanceUpdateFromDownstream(provider_info['wad']);
        if (! was_ready) {
            this.seller_stack.providerNowReadyFromApp();
        }
    }

    consumerOnPing(msecs) {
        this.seller_app_ui.pingUpdate(msecs);
    }

    consumerOnStackEvent(layer_name, nexus, status) {
        this.consumer_ui.postStackEvent(layer_name, status);
    }

    consumerOnBolt11(bolt11, request_reference_uuid) {
        //console.log("got invoice from consumer: " + request_reference_uuid);
        //console.log("payment hash: " + Bolt11.getPaymentHash(bolt11));
        if (! (request_reference_uuid in this.requested_items)) {
            console.error("got bolt11 not requested?");
        } else {
            this.seller_stack.fulfilOpinionInvoiceRequest(
                bolt11, request_reference_uuid);
            var payment_hash = Bolt11.getPaymentHash(bolt11);
            var item_id = this.requested_items[request_reference_uuid];
            delete this.requested_items[request_reference_uuid];
            var record = {'item_id': item_id,
                          'request_reference_uuid': request_reference_uuid};
            this.payment_hash_items[payment_hash] = record;
        }
    }

    consumerOnPreimage(preimage, request_reference_uuid) {
        console.log("got preimage from consumer: " + preimage);
        var payment_hash = Bolt11.preimageToPaymentHash(preimage);

        if (! (payment_hash in this.payment_hash_items)) {
            console.log("payment hash not requested?");
        } else {
            var record = this.payment_hash_items[payment_hash];
            delete this.payment_hash_items[payment_hash];
            var item_id = record['item_id'];
            var request_reference_uuid = record['request_reference_uuid'];
            var opinion = this.getItem(item_id);
            console.log("fulfilling opinion: " + opinion);
            this.seller_stack.fulfilOpinion(item_id, opinion,
                                            request_reference_uuid);
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Seller Stack Callbacks
    ///////////////////////////////////////////////////////////////////////////

    handleOpinionInvoiceRequest(item_id, request_uuid) {
        if (item_id == 'hello') {
            this.consumer_stack.requestInvoice(this.getHelloMsatPrice(),
                                               request_uuid, "Hello World");
        } else if (item_id == 'time') {
            this.consumer_stack.requestInvoice(this.getTimeMsatPrice(),
                                               request_uuid,
                                               "Current Timestamp");
        } else if (item_id == 'outlook') {
            this.consumer_stack.requestInvoice(this.getOpinionMsatPrice(),
                                               request_uuid,
                                               "Market Outlook");
        } else {
            console.error("unknown item_id");
        }
        console.log("adding invoice request: " + request_uuid);
        this.requested_items[request_uuid] = item_id;
    }

    handleSellerInfoRequest() {
        // track and provide seller stuff
        if (this.store_open) {
            return {'ready': true,
                    'seller_uuid': this.seller_uuid,
                    'items': [{'item_id': 'hello',
                               'name':    'Hello World',
                               'msats':   this.getHelloMsatPrice(),
                              },
                              {'item_id': 'time',
                               'name':    'Current Timestamp',
                               'msats':   this.getTimeMsatPrice(),
                              },
                              {'item_id': 'outlook',
                               'name':    'Market Outlook',
                               'msats':   this.getOpinionMsatPrice(),
                              },
                            ],
                   }
        } else {
            return {'ready': false}
        }
    }

    sellerOnNexusOnline(nexus) {
        console.log("---");
        this.seller_app_ui.providerOnline();
    }

    sellerOnNexusOffline() {
        this.seller_app_ui.providerOffline();
    }

    sellerOnStackEvent(layer_name, nexus, status) {
        this.seller_ui.postStackEvent(layer_name, status);
    }

    ///////////////////////////////////////////////////////////////////////////

    handleProviderInfoRequest(shared_seed) {
        return this.provider_info;
    }
}


window.app = new SellerApp();

function drawFirstUi() {
    window.app.drawSellerUi()
}

window.addEventListener("load", drawFirstUi());
