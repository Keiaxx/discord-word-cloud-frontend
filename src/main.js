import Vue from 'vue'
import './plugins/vuetify'
import App from './App.vue'
import './registerServiceWorker'
import VueTerm from 'vue-term'
import VueWordCloud from 'vuewordcloud';
import Chat from 'vue-beautiful-chat'

Vue.use(Chat)
Vue.component(VueWordCloud.name, VueWordCloud);
Vue.config.productionTip = false
Vue.use(VueTerm)

new Vue({
  render: h => h(App),
}).$mount('#app')
