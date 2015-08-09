/**
 * Created by pman-taichi on 15/08/09.
 */

(function($){
    "use strict";
    var mediaStream
    var $chat;
    var $video;
    var $users;
    var $button;

    /**
     * skywayのサーバーへ接続してpeerオブジェクトを取得する
     * @returns {Promise}
     */
    var connectToSkyway = function (){
        return new Promise(function(resolve, reject){
            var peer = new Peer({key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',debug:0});
            peer.on('open', function(id) {
                resolve(peer);
            });
        });
    };
    /**
     * 自分以外のPeerIDリストを取得して作成
     * @param peer
     * @returns {Promise}
     */
    var getUserList = function(peer){
        return new Promise(function(resolve, reject) {
            peer.listAllPeers(function (list) {
                var l = [];
                for(var i=0;i<list.length;i++){
                    if(peer.id !== list[i]){
                        l.push(list[i]);
                    }
                }
                resolve(l);
            });
        });
    };
    /**
     * カメラやマイクへのアクセスを取得。ブラウザに許可を促すアラートがでる。
     * @returns {Promise}
     */
    var getUserMedia = function(){
        return new Promise(function(resolve, reject) {
            navigator.getUserMedia = ( navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);
            if (navigator.getUserMedia) {
                navigator.getUserMedia(
                    // constraints
                    {
                        video: true,
                        audio: true
                    },
                    // successCallback
                    function (localMediaStream) {
                        mediaStream = localMediaStream;
                        resolve(localMediaStream);
                    },
                    // errorCallback
                    function (err) {
                        console.log("The following error occured: " + err);
                        reject(err);
                    }
                );
            } else {
                var message = "getUserMedia not supported";
                console.log(message);
                reject(message);
            }
        });
    };

    /**
     * Peerに対してイベントをセットする。
     * @param peer
     * @returns {Peer}
     */
    var setPeerEvent = function (peer) {
        //データ用の接続イベントを受信したら
        peer.on('connection', function(conn){
            openConn(conn);
        });
        //呼び出しされたら
        peer.on('call', function(call) {
            // 呼び出されたら自分のメディアストリームを渡して応答する。
            call.answer(mediaStream);
            streamCall(call);
        });
        return peer;
    };

    /**
     * チャット表示部分にメッセージを追加する。
     * @param message
     * @param mine trueなら自分が送信したメッセージ
     */
    var appendChartMessage = function(message,mine){
        var now = new Date();
        //var li = $('<li>[' +  now + '] '+ message + '</li>');
        var li = $('<li>'+ message + '</li>');
        if(mine){
            li.css('color','green');
        }
        $chat.append(li);
    };

    /**
     * データ用接続にイベントを設定するのと、送信用のフォームを作っている。
     * @param {DataConnection} conn
     */
    var openConn = function(conn){
        conn.on('open', function() {
            //データを受信したら
            conn.on('data', function(data) {
                appendChartMessage(data);
            });
            var text = $('<textarea />');
            var btn = $('<button>送信</button>');
            //送信ボタンをクリックしたら
            btn.on('click', function(e){
                e.preventDefault();
                conn.send(text.val());//データを送信
                appendChartMessage(text.val(),true);
                text.val('');
                text.focus();
            });
            var d = $('<div />');
            d.append(text).append(btn);
            $button.append(d);
        });
    };

    /**
     * メディアコネクションにイベントを設定
     *
     * @param {MediaConnection} call
     */
    var streamCall = function(call){
        call.on('stream', function(stream) {
            //相手のメディアストリームをvideoタグにセットしている。
            //これだけで相手の映像が表示出来ちゃうんだからすごい！
            var $videoElm = $('<video />');
            $video.append($videoElm);
            var video = $videoElm.get(0);
            video.src = window.URL.createObjectURL(stream);
            setTimeout(function(ev){
                video.play();
            }, 5000);
        });
    };

    /**
     * ユーザーリストを表示
     * ついでに、リストの中のIDをクリックしたら相手へ接続して、接続出来たあとの処理もするようにしてある。
     * @param {Peer} peer
     * @returns {Function}
     */
    var showUserList = function(peer){
        return function(list) {
            var peerConnect = function () {
                var id = $(this).text();
                var conn = peer.connect(id);
                openConn(conn);
                var call = peer.call(id, mediaStream);
                console.log(mediaStream);
                streamCall(call);
            };
            $users.append($('<li>myID: ' + peer.id + "</li>"));
            list.map(function (v) {
                var a = $('<a href="#">' + v + '</a>');
                a.on('click', peerConnect);
                $users.append($('<li />').append(a));
            });
        };
    };


    $(document).ready(function(){
        $chat = $('ul.chat');
        $video = $('div.video');
        $users = $('ul.users');
        $button = $('div.button');

        //Promiseを使ってなんとなくわかりやすくしてみたが、コールバックでもいい気もする・・・
        getUserMedia()
            .then(connectToSkyway)
            .then(setPeerEvent)
            .then(function(peer){
                return getUserList(peer)
                    .then(showUserList(peer));
            })
            .catch(function(message){
                console.log(message);
            });
    });
})(jQuery);
