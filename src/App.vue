<template>
    <v-app :dark="darkTheme">
        <v-toolbar app dense>
            <v-toolbar-title class="headline text-uppercase">
                <span>MOON</span>
                <span class="font-weight-light">CLOUD</span>


            </v-toolbar-title>
            <v-spacer></v-spacer>

            Selected Channel: #{{selectedChannel}}

            <v-btn @click.native="dialog = true">
                Cloud Options
            </v-btn>
        </v-toolbar>


        <v-content>
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
                            :color="([, weight]) => weight > (this.defaultWords[Math.floor(this.defaultWords.length*0.1)][1]) ? '#56BC76' : weight > (this.defaultWords[Math.floor(this.defaultWords.length*0.3)][1]) ? '#E8704F' : weight > (this.defaultWords[Math.floor(this.defaultWords.length*0.6)][1]) ? '#618FB0' : '#565B5C'"
                            font-family="Cabin"
                            @update:progress="progressChanged"
                    >
                        <template slot-scope="props">
                            <v-tooltip top>
                                <div
                                        slot="activator"
                                        style="cursor: pointer;"
                                        @click="onWordClick(props.word)"
                                >{{ props.text }}
                                </div>
                                <div
                                        style="text-align: center;"
                                >{{ props.text }}<br/>({{ props.weight }})
                                </div>
                            </v-tooltip>
                        </template>
                    </vue-word-cloud>

                    <v-progress-circular
                            v-if="progress"
                            :rotate="-90"
                            :size="200"
                            :width="20"
                            class="v-no-animation"
                            color="primary"
                            style="
									bottom: 0;
									left: 0;
									margin: auto;
									position: absolute;
									right: 0;
									top: 0;
								"
                            indeterminate
                    >Generating Cloud...
                    </v-progress-circular>
                </div>


            </v-container>
        </v-content>


        <v-dialog
                v-model="dialog"
                width="400"
                persistent
        >

            <v-card>
                <v-card-title
                        primary-title
                >
                    Generate Cloud
                </v-card-title>

                <v-card-text class="pt-0">
                    <v-combobox
                            v-model="selectedChannel"
                            :items="channels"
                            label="Select a Channel"
                    ></v-combobox>

                    <v-combobox
                            v-model="selectedType"
                            :items="types"
                            label="Select cloud type"
                    ></v-combobox>

                    <v-layout>
                        <v-flex xs12
                                md6><v-switch :label="filtertime ? `Filter recent words` : `Use all words`" v-model="filtertime"></v-switch></v-flex>

                        <v-flex xs12
                                md6>
                        <v-text-field v-if="filtertime"
                                      v-model="lastseconds"
                                      class="mt-0"
                                      label="Recently said in Seconds"
                                      type="number"
                        ></v-text-field>
                        </v-flex>
                    </v-layout>

                    <div v-if="channelStats.loaded">
                        Total Words: {{channelStats.totalWords}}
                        Total Emotes: {{channelStats.totalEmotes}}
                    </div>

                </v-card-text>


                <v-divider></v-divider>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn
                            color="primary"
                            flat
                            @click="generateCloud"
                    >
                        Generate
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-scale-transition>
            <v-progress-circular
                    v-if="loading"
                    :rotate="-90"
                    :size="200"
                    indeterminate
                    :width="20"
                    class="v-no-animation"
                    color="primary"
                    style="
									bottom: 0;
									left: 0;
									margin: auto;
									position: absolute;
									right: 0;
									top: 0;
								"
            >Loading</v-progress-circular>
        </v-scale-transition>

        <v-fab-transition>
            <v-btn

                    dark
                    fab
                    fixed
                    bottom
                    left
            >
                <v-icon>timeline</v-icon>
            </v-btn>
        </v-fab-transition>

    </v-app>
</template>

<script>
  import stopword from 'stopword'
  import wordcloud from 'vue-wordcloud'
  import VueWordCloud from 'vuewordcloud'
  import axios from 'axios'
  import common from './assets/common'

  export default {
    components: {
      wordcloud,
      [VueWordCloud.name]: VueWordCloud,
    },
    data () {
      return {
        filtertime: false,
        lastseconds: 1,
        fab: false,
        selectedType: '',
        types: ['Words', 'Emotes', 'Words & Emotes'],
        channels: ['Loading...'],
        selectedChannel: '',
        channelStats: {totalWords: 0, totalEmotes: 0, loaded: false},
        dialog: true,
        progress: undefined,
        darkTheme: true,
        threshold: 10,
        maxWordLen: 3,
        myColors: ['#1f77b4', '#629fc9', '#94bedb', '#c9e0ef'],
        defaultWords: [],
        wordMap: {},
        awaitingResult: [],
        alwaysScrollToBottom: false,// when set to true always scrolls the chat to the bottom when new events are in (new message, user starts typing...)
        messageStyling: true, // enables *bold* /emph/ _underline_ and such (more info at github.com/mattezza/msgdown)
        loading: false
      }
    },
    watch: {
      selectedChannel: function (val) {
        this.getChannelStats()
      }
    },
    methods: {
      progressChanged(prog){
        if(!prog)return
        if(prog.completedWords === 100){
          this.loading = false
        }
      },
      loadHistoryMap () {
        var _this = this
        axios.get('https://mooncloud.k31.us/api/words')
          .then(function (response) {

            _this.wordMap = response.data
            _this.populateChannels()
            // _this.convertWordMap()

          })
          .catch(function (error) {
            console.log(error)
          })
      },
      processWord (word) {

        if (word in this.wordMap) {
          this.wordMap[word] = this.wordMap[word] + 1
        } else {
          //Not exist yet
          this.wordMap[word] = 1
        }

      },
      populateChannels () {
        this.channels = ['All Channels']
        var data = Object.keys(this.wordMap.wordMap)
        this.channels = this.channels.concat(data)
      },
      generateCloud () {
        this.loading = true
        this.dialog = false
        this.viewResult()
      },
      getChannelStats () {

        if (this.selectedChannel === 'All Channels') {

          return
        }

        try {
          this.channelStats.totalEmotes = Object.keys(this.wordMap.wordMap[this.selectedChannel]['emote']).length
        } catch (e) {
          this.channelStats.totalEmotes = 0
        }

        try {
          this.channelStats.totalWords = Object.keys(this.wordMap.wordMap[this.selectedChannel]['word']).length
        } catch (e) {
          this.channelStats.totalWords = 0
        }

        this.channelStats.loaded = true

        console.log(this.channelStats)

        this.convertWordMap()
      },
      convertWordMap () {
        var _this = this
        var originalcount = 0
        var maxwordlength = this.maxWordLen

        let keys = Object.keys(this.wordMap.wordMap[this.selectedChannel]['word'])
        let ts = Math.round((new Date()).getTime() / 1000);

        var result = keys.filter(function(key){
          let lastupdated = _this.wordMap.wordMap[_this.selectedChannel]['word'][key]['d']
          if(this.filtertime) {
            return (ts - lastupdated) < (this.lastseconds)
          }else{
            return true
          }

        }).map(function (key) {
          //return {'name': key, 'value': _this.wordMap[key]}
          let count = _this.wordMap.wordMap[_this.selectedChannel]['word'][key]['f']


          originalcount++
          return [key, count]
        }).filter(function (key) {

          if (common.includes(key[0].toLowerCase())) return false
          return true
        }).sort(function (a, b) {
          if (a[1] < b[1])
            return 1
          if (a[1] > b[1])
            return -1
          return 0
        })

        //this.defaultWords = result

        console.log('Number of words to display: ' + result.length + ' OC: ' + originalcount)

        console.log(result)

        this.awaitingResult = result.slice(0, 100)

      },
      viewResult () {
        this.defaultWords = this.awaitingResult
      },
      processParticipants () {
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
          this.participantMap[user] = 'o'
          this.processParticipants()

          if (bot) return

          //{ type: 'text', author: `user1`, data: { text: `No.` } }

          this.messageList.push({type: 'text', author: user, data: {text: message}})
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
      // this.connect()
    }
  }
</script>

<style>
    @import url('https://fonts.googleapis.com/css?family=Cabin');
</style>

