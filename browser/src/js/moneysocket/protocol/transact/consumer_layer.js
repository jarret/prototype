// Copyright (c) 2020 Jarret Dyrbye
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const ProtocolLayer =  require("../layer.js").ProtocolLayer;
const ConsumerTransactNexus = require(
    "./consumer_nexus.js").ConsumerTransactNexus;


class ConsumerTransactLayer extends ProtocolLayer {
    constructor(below_layer) {
        super(below_layer);

        this.oninvoice = null;
        this.onpreimage = null;
    }

    ///////////////////////////////////////////////////////////////////////////

    setupConsumerTransactNexus(below_nexus) {
        var n = new ConsumerTransactNexus(below_nexus, this);
        n.oninvoice = (function(nexus, bolt11, request_reference_uuid) {
            this.onInvoice(nexus, bolt11, request_reference_uuid);
        }).bind(this);
        n.onpreimage = (function(nexus, preimage, request_reference_uuid) {
            this.onPreimage(nexus, preimage, request_reference_uuid);
        }).bind(this);
        return n;
    }

    ///////////////////////////////////////////////////////////////////////////

    announceNexus(below_nexus) {
        console.log("consumer transact layer got nexus");
        var consumer_transact_nexus = this.setupConsumerTransactNexus(
            below_nexus);
        this._trackNexus(consumer_transact_nexus, below_nexus);
        this._trackNexusAnnounced(consumer_transact_nexus);
        if (this.onnexusonline != null) {
            console.log("consumer transact announced nexues");
            this.onnexusonline(consumer_transact_nexus);
            console.log("consumer transact finished announcing nexues");
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    onInvoice(consumer_transact_nexus, bolt11, request_reference_uuid) {
        if (this.oninvoice != null) {
            this.oninvoice(consumer_transact_nexus, bolt11,
                           request_reference_uuid);
        }
    }

    onPreimage(consumer_transact_nexus, preimage, request_reference_uuid) {
        if (this.onpreimage != null) {
            this.onpreimage(consumer_transact_nexus, preimage,
                            request_reference_uuid);
        }
    }
}


exports.ConsumerTransactLayer = ConsumerTransactLayer;
