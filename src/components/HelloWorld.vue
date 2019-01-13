<template>
    <v-container
            fill-height
            hide-overflow
    >

        <div
                style="
							height: 100%;
							position: relative;
							width: 100%;
						"
        >

            <vue-word-cloud
                    :animation-duration="0"
                    :spacing="0.2"
                    :words="defaultWords"
                    :color="([, weight]) => weight > 8 ? '#EA6668' : weight > 4 ? '#4AB0CE' : '#618FB0'"
                    font-family="Cabin"
            />

            <beautiful-chat
                    :participants="participants"
                    :titleImageUrl="titleImageUrl"
                    :onMessageWasSent="onMessageWasSent"
                    :messageList="messageList"
                    :newMessagesCount="newMessagesCount"
                    :isOpen="isChatOpen"
                    :close="closeChat"
                    :open="openChat"
                    :showEmoji="false"
                    :showFile="false"
                    :showTypingIndicator="showTypingIndicator"
                    :colors="colors"
                    :alwaysScrollToBottom="alwaysScrollToBottom"
                    :messageStyling="messageStyling"></beautiful-chat>
        </div>



    </v-container>
</template>

<script>
  import stopword from 'stopword'
  import wordcloud from 'vue-wordcloud'
  import VueWordCloud from 'vuewordcloud'
  import axios from 'axios'

  export default {
    components: {
      wordcloud,
      [VueWordCloud.name]: VueWordCloud,
    },
    data () {
      return {
        threshold: 3,
        myColors: ['#1f77b4', '#629fc9', '#94bedb', '#c9e0ef'],
        defaultWords: [],
        wordMap: {},
        participantMap: {},
        participants: [
          {
            id: 'user1',
            name: 'Bitmex'
          }
        ], // the list of all the participant of the conversation. `name` is the user name, `id` is used to establish the author of a message, `imageUrl` is supposed to be the user avatar.
        titleImageUrl: 'https://a.slack-edge.com/66f9/img/avatars-teams/ava_0001-34.png',
        messageList: [
        ], // the list of the messages to show, can be paginated and adjusted dynamically
        newMessagesCount: 0,
        isChatOpen: false, // to determine whether the chat window should be open or closed
        showTypingIndicator: '', // when set to a value matching the participant.id it shows the typing indicator for the specific user
        colors: {
          header: {
            bg: '#618FB0',
            text: '#ffffff'
          },
          launcher: {
            bg: '#343739'
          },
          messageList: {
            bg: '#565B5C'
          },
          sentMessage: {
            bg: '#4e8cff',
            text: '#ffffff'
          },
          receivedMessage: {
            bg: '#eaeaea',
            text: '#222222'
          },
          userInput: {
            bg: '#f4f7f9',
            text: '#565867'
          }
        }, // specifies the color scheme for the component
        alwaysScrollToBottom: false,// when set to true always scrolls the chat to the bottom when new events are in (new message, user starts typing...)
        messageStyling: true, // enables *bold* /emph/ _underline_ and such (more info at github.com/mattezza/msgdown)
        lastBTCPrice: 0.0
      }
    },
    methods: {
      sendMessage (text) {
        if (text.length > 0) {
          this.newMessagesCount = this.isChatOpen ? this.newMessagesCount : this.newMessagesCount + 1
          this.onMessageWasSent({ author: 'support', type: 'text', data: { text } })
        }
      },
      onMessageWasSent (message) {
        // called when the user sends a message
        this.messageList = [ ...this.messageList, message ]
      },
      openChat () {
        // called when the user clicks on the fab button to open the chat
        this.isChatOpen = true
        this.newMessagesCount = 0
      },
      closeChat () {
        // called when the user clicks on the botton to close the chat
        this.isChatOpen = false
      },
      wordClickHandler (name, value, vm) {
        console.log('wordClickHandler', name, value, vm)
      },
      connect () {
        console.log('TEST')
        // Let us open a web socket
        let _this = this
        var ws = new WebSocket('wss://www.bitmex.com/realtime?subscribe=chat,instrument')

        ws.onopen = function () {
          console.log('CONNECTED')
        }

        ws.onmessage = function (evt) {
          var received_msg = evt.data

          if(JSON.parse(received_msg).table === "chat") _this.processMessage(received_msg)
          if(JSON.parse(received_msg).table === "instrument") _this.processTicker(JSON.parse(received_msg))
        }

        ws.onclose = function () {

        }
      },
      processTicker(data){
        var d = data.data[0]
        var instrument = d.symbol

        if(instrument === "XBTUSD"){
          if(d.lastPrice){
            this.lastBTCPrice = d.lastPrice;
          }
        }

      },
      loadHistoryMap(){
        var _this = this
        axios.get('https://cors.io/?http://ub1.gose.pw/history')
          .then(function (response) {

            _this.wordMap = response.data
            _this.convertWordMap()

          })
          .catch(function (error) {
            console.log(error);
          });
      },
      processWord (word) {

        if (word in this.wordMap) {
          this.wordMap[word] = this.wordMap[word] + 1
        } else {
          //Not exist yet
          this.wordMap[word] = 1
        }

      },
      convertWordMap () {
        var _this = this
        var result = Object.keys(this.wordMap).map(function (key) {
          //return {'name': key, 'value': _this.wordMap[key]}
          let count = _this.wordMap[key]
          return [key, count]
        }).filter(function(key){
          return key[1] > _this.threshold
        });

        this.defaultWords = result

      },
      processParticipants(){
        // {
        //   id: 'user1',
        //     name: 'Bitmex'
        // }

        var _this = this
        var result = Object.keys(this.participantMap).map(function (key) {
          //return {'name': key, 'value': _this.wordMap[key]}
            return {id: key, name: key}
        })
        this.participants = result
      },
      processMessage (msg) {
        msg = JSON.parse(msg)

        var line = msg.data[0]

        if (line.channelID === 1) {
          let user = line.user
          let message = line.message
          let bot = line.fromBot

          this.newMessagesCount++
          this.participantMap[user] = "o"
          this.processParticipants()

          if (bot) return;

          //{ type: 'text', author: `user1`, data: { text: `No.` } }

          this.messageList.push({ type: 'text', author: user, data: { text: message} })
          //'console.log(colors.green(user) + ": " + colors.yellow(message))

          let words = message.split(' ')

          words = stopword.removeStopwords(words)

          for (var word in words) {
            var w = words[word]

            w = w.trim()
            w = w.toUpperCase()

            //Ignore tags
            if (w.endsWith(':')) continue

            let matches = w.match(/[a-zA-Z0-9.']+/g)

            if (matches && matches.length > 0) {
              w = matches[0]

              if (w.length > 1)
                this.processWord(w)
            }

          }

          this.convertWordMap()

        }
      }
    },
    mounted: function () {
      console.log('MOUNTED')
      this.loadHistoryMap()
      this.connect()
    }
  }
</script>

<style>
    @import url('https://fonts.googleapis.com/css?family=Cabin');
</style>
