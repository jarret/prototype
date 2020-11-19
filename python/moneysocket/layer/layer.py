# Copyright (c) 2020 Jarret Dyrbye
# Distributed under the MIT software license, see the accompanying
# file LICENSE or http://www.opensource.org/licenses/mit-license.php

import sys
import logging

class Layer(object):
    def __init__(self, stack, above_layer, layer_name):
        self.stack = stack
        self.layer_name = layer_name
        assert "announce_nexus_from_below_cb" in dir(above_layer)
        assert "revoke_nexus_from_below_cb" in dir(above_layer)
        assert "post_layer_stack_event_cb" in dir(stack)
        self.announce_nexus_above_cb = above_layer.announce_nexus_from_below_cb
        self.revoke_nexus_above_cb = above_layer.revoke_nexus_from_below_cb
        self.nexuses = {}
        self.below_nexuses = {}
        self.nexus_by_below = {}
        self.below_by_nexus = {}
        self.announced = {}

    def _track_nexus(self, nexus, below_nexus):
        self.nexuses[nexus.uuid] = nexus
        self.below_nexuses[below_nexus.uuid] = below_nexus
        self.nexus_by_below[below_nexus.uuid] = nexus.uuid
        self.below_by_nexus[nexus.uuid] = below_nexus.uuid
        self.notify_app_of_status(nexus, "NEXUS_CREATED")

    def _untrack_nexus(self, nexus, below_nexus):
        del self.nexuses[nexus.uuid]
        del self.below_nexuses[below_nexus.uuid]
        del self.nexus_by_below[below_nexus.uuid]
        del self.below_by_nexus[nexus.uuid]
        self.notify_app_of_status(nexus, "NEXUS_DESTROYED")

    ###########################################################################

    def _track_nexus_announced(self, nexus):
        self.announced[nexus.uuid] = nexus

    def _is_nexus_announced(self, nexus):
        return nexus.uuid in self.announced

    def _track_nexus_revoked(self, nexus):
        assert self._is_nexus_announced(nexus)
        del self.announced[nexus.uuid]

    ###########################################################################

    def announce_nexus_from_below_cb(self, below_nexus):
        sys.exit("implement in subclass")

    def revoke_nexus_from_below_cb(self, below_nexus):
        nexus = self.nexuses[self.nexus_by_below[below_nexus.uuid]]
        self._untrack_nexus(nexus, below_nexus)
        if self._is_nexus_announced(nexus):
            self._track_nexus_revoked(nexus)
            self.revoke_nexus_above_cb(nexus)
            self.notify_app_of_status(nexus, "NEXUS_REVOKED")

    ###########################################################################

    def notify_app_of_status(self, nexus, status):
        self.stack.post_layer_stack_event_cb(self.layer_name, nexus, status)
