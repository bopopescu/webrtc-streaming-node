/* jshint -W117 */
var logger = require("jitsi-meet-logger").getLogger(__filename);
var strophe = require("node-strophe").Strophe;
var Strophe = strophe.Strophe;


module.exports = function() {
    Strophe.addConnectionPlugin('rayo',
        {
            RAYO_XMLNS: 'urn:xmpp:rayo:1',
            connection: null,
            init: function (conn) {
                this.connection = conn;
                if (this.connection.disco) {
                    this.connection.disco.addFeature('urn:xmpp:rayo:client:1');
                }

                this.connection.addHandler(
                    this.onRayo.bind(this),
                    this.RAYO_XMLNS, 'iq', 'set', null, null);
            },
            onRayo: function (iq) {
                logger.info("Rayo IQ", iq);
            },
            dial: function (to, from, roomName, roomPass) {
                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: this.connection.emuc.focusMucJid
                    }
                );
                req.c('dial',
                    {
                        xmlns: this.RAYO_XMLNS,
                        to: to,
                        from: from
                    });
                req.c('header',
                    {
                        name: 'JvbRoomName',
                        value: roomName
                    }).up();

                if (roomPass !== null && roomPass.length) {

                    req.c('header',
                        {
                            name: 'JvbRoomPassword',
                            value: roomPass
                        }).up();
                }

                this.connection.sendIQ(
                    req,
                    function (result) {
                        logger.info('Dial result ', result);

                        var resource = $(result).find('ref').attr('uri');
                        this.call_resource = resource.substr('xmpp:'.length);
                        logger.info(
                            "Received call resource: " + this.call_resource);
                    },
                    function (error) {
                        logger.info('Dial error ', error);
                    }
                );
            },
            hang_up: function () {
                if (!this.call_resource) {
                    logger.warn("No call in progress");
                    return;
                }

                var self = this;
                var req = $iq(
                    {
                        type: 'set',
                        to: this.call_resource
                    }
                );
                req.c('hangup',
                    {
                        xmlns: this.RAYO_XMLNS
                    });

                this.connection.sendIQ(
                    req,
                    function (result) {
                        logger.info('Hangup result ', result);
                        self.call_resource = null;
                    },
                    function (error) {
                        logger.info('Hangup error ', error);
                        self.call_resource = null;
                    }
                );
            }
        }
    );
};
