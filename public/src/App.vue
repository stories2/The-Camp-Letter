<template>
  <div id="app">
    <h1>{{ msg }}</h1>
    <h2>편지 전송 현황</h2>
    <ul>
      <li v-for="letter in letterList">#{{letter.seq}} {{letter.uptDate}} {{letter.uptTime}} - {{letter.statusNm}}</li>
    </ul>
    <h2>서버 상태 현황</h2>
    <ul>
      <li v-for="status in reverseStatusList">#{{timeToDateTime(status.time)}} - {{status.message}}</li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'app',
  data () {
    return {
      msg: 'The Camp 위문 편지 전송 매크로',
      statusList: [],
      letterList: []
    }
  },
  computed: {
    reverseStatusList () {
      return this.statusList.sort((a, b) => a.time < b.time ? 1 : -1);
    }
  },
  methods: {
    timeToDateTime: (time) => {
      const date = new Date(time)
      var mm = date.getMonth() + 1;
      var dd = date.getDate();
      var hh = date.getHours();
      var mi = date.getMinutes();
      var ss = date.getSeconds();

      return [date.getFullYear(),
              (mm>9 ? '' : '0') + mm,
              (dd>9 ? '' : '0') + dd,
              (hh>9 ? '' : '0') + hh,
              (mi>9 ? '' : '0') + mi,
              (ss>9 ? '' : '0') + ss
            ].join(' ');
    },
    getStatusList: (vue) => {
      console.log('get status')
      axios.get('https://asia-northeast1-the-camp-macro.cloudfunctions.net/macro/status')
      .then(res => res.data)
      .then(res => {
        console.log('res', res);
        if (res.success) {
          console.log('-data', vue)
          vue.statusList = [];
          for(const key in res.data) {
            const data = res.data[key];
            console.log('this.status', vue.statusList)
            vue.statusList.push(data);
          }
        }
      })
      .catch(err => {
        console.log('err', err);
      })
    },
    getLetterList: (vue) => {
      console.log('get letter');
      axios.get('https://asia-northeast1-the-camp-macro.cloudfunctions.net/macro/letter')
      .then(res => res.data)
      .then(res => {
        console.log('res', res);
        if (res.success) {
          vue.letterList = res.data;
          console.log('-data', vue)
        }
      })
      .catch(err => {
        console.log('err', err);
      })
    }
  },
  created() {
    this.statusList = [];
    this.letterList = [];
  },
  mounted() {
    this.getStatusList(this);
    this.getLetterList(this);
  },
  beforeUpdate() {
    console.log('beforeUpdate data', this.statusList)
    console.log('beforeUpdate data', this.letterList)
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

h1, h2 {
  font-weight: normal;
  word-break: keep-all;
}

ul {
  list-style-type: none;
  padding: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

li {
  max-width: 400px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
