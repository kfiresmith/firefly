<template>
 <v-app class="app" dark>
    <v-system-bar status :color="iosstatusbarcolor" v-show="isios">
      <v-spacer></v-spacer>
      
    </v-system-bar>

    <router-view></router-view>

 </v-app>
</template>

<script>
  import Vue from 'vue'
  import { mapActions,mapState } from 'vuex'
  import PinCode from './components/PinCode'
  import { defaultTradePairsAPI } from '@/api/gateways'
  import { closeStreams, initStreams } from '@/streams'
  import { initStorage,checkPlatform } from '@/api/storage'

  export default {
    data () {
      return {
        pauseStart: null,//暂时的起始时间
        pauseMaxSecond: 60,//最大
        isios: false,
      }
    },
    computed:{
      ...mapState({
          showloading: state => state.showloading,
          locale: state => state.app.locale,
          alldata: state => state,
          address: state => state.accounts.selectedAccount.address,
          iosstatusbarcolor: state => state.iosstatusbarcolor,
          accounts: state => state.accounts.data,
        })
    },
    beforeMount(){
      Vue.cordova.on('deviceready', () => {
        checkPlatform()
        try{
          //获取默认交易对
          defaultTradePairsAPI()
        }catch(err){
          console.error('获取默认交易对失败！')
          console.error(err)
        }

        //添加cordova事件
        document.addEventListener("pause", ()=>{
          this.onPause()
        }, false);
        document.addEventListener("resume", ()=>{
          this.onResume()
        }, false);

        console.log('Cordova : device is ready !')
        console.log(cordova)
        if('ios'===cordova.platformId){
           this.isios = true
        }
        navigator.splashscreen.hide()
        if(StatusBar && !StatusBar.isVisible){
          StatusBar.show()
          StatusBar.backgroundColorByHexString("#21ce90")
          this.$store.commit('CHANGE_IOSSTATUSBAR_COLOR','primary')
        }
        //加载系统配置
        this.loadAppSetting().then(data=>{
          //if(this.alldata.app.enablePin){
          //  this.showConfirmPin = true
          //}
          //如果data不为空，则跳转到主界面，否则跳转到创建账户界面
          if(this.locale){
            this.$i18n.locale = this.locale.key
          }
         // navigator.splashscreen.hide();
          return this.loadAccounts()
        })
        .then(data=>{
          console.log('read accounts')
          console.log(data)
          navigator.splashscreen.hide();
          
          //尝试加载当前账户信息
          try{
            if(this.address){
              this.getAccountInfo(this.address)
              closeStreams()
              initStreams(this.address)
              this.getAllAssetHosts()
            }
          }catch(err){
            console.log(err)
          }
          if(this.alldata.app.enablePin){
            this.$router.push(`/pinlock`)
          }else{
             if(this.accounts.length === 0){
               this.$router.push(`wallet`)
             }else{
               this.$router.push('/main')
             }
          }
        })
        .catch(err=>{
          console.log('load app setting error ')
          console.log(err)
          // 跳转到错误界面
          //this.$toasted.error(err._message)
          navigator.splashscreen.hide()
         
          initStorage().then(()=>{
            console.log('---init storage ok---')
            this.saveAppSetting({})
          }).catch(err=>{
            console.error('---init storage error---')
            console.error(err)
            this.saveAppSetting({})
          })
          //保存默认的设置数据
          
          this.$router.push('/wallet')

        });

      
        

      })

    },
    methods: {
      ...mapActions(['loadAppSetting',
        'getLedger',
        'loadAccounts',
        'saveAppSetting',
        'afterPauseAppSetting',
        'getAccountInfo',
        'getAllAssetHosts'
        ]),
      onPause(){
        this.pauseStart = new Date().getTime()
        console.log('-------------on pause ------' + this.pauseStart)
      },
      onResume(){
        //暂停恢复,判断是否要输入pin码
        if(this.alldata.app.enablePin){
          let pauseEnd = new Date().getTime()
          let total = (pauseEnd - this.pauseStart)/1000
          if(total >= this.pauseMaxSecond){
            this.$router.push(`/pinlock`)
          }
        }
      },

    },
    components:{
      PinCode
    }
  }
</script>
<style lang="stylus">
@require './stylus/color.styl'
.app
  background-color: $primarycolor.gray
.hide
  background: none
  background-color:transparent
.loading
  position: fixed
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: $primarycolor.green
  opacity: 0.8
  z-index: 99
  display: block
  text-align: center
  vertical-align: center
  img
    margin-top: 60%
    width: 100px
    height: 100px
.app-pin
  position: absolute
  top: 0
  bottom: 0
  left: 0
  right: 0
  //height: 100%
  background: $primarycolor.gray
  z-index: 9999
  .pin-bar
    height: 56px
    line-height: 56px
    font-size: 20px
    display: flex
    color: $primarycolor.font
    -webkit-align-items: center
    align-items: center
    -webkit-justify-content: center
    justify-content: center

    background: $primarycolor.green
    .pin-bar-icon
      flex: 1
      text-align: center
      justify-content: center
      -webkit-align-items: center
      align-items: center
      -webkit-justify-content: center
      justify-content: center
      height: 56px
      line-height: 56px
      .material-icons
        font-size: 32px
        height: 56px
        line-height: 56px
    .pin-bar-title
      flex: 6
      text-align: center

@css{
  html{
    background: none;
    background-color: transparent;
  }
  .white-input:not(.input-group--focused)> .input-group__input{
    border-bottom: 1px solid #FFF;
  }
  .application--light .input-group:not(.input-group--error) label{
    color:#FFF;
  }
  .application--light .input-group:not(.input-group--error) label:after{
    color:#f35530;
  }
  .app.application.theme--dark{
    background: #212122;
  }
  .app.application.theme--dark.hide{
    background: none;
    background-color:transparent;
  }
  
  .application--light .input-group:not(.input-group--error):not(.input-group--focused):not(.input-group--disabled) .input-group__input .input-group__append-icon{
    color:#FFF;
  }
  .application--light .input-group input{
    color:#FFF;
  }
  .amount-slider.input-group.input-group--slider .input-group__input .slider .slider__track__container .slider__track-fill,
  .amount-slider.input-group.input-group--slider .input-group__input .slider .slider__thumb-container .slider__thumb{
    background: #f35833;
  }
  @supports (bottom: constant(safe-area-inset-bottom)) {
    .footer {
      margin-bottom: constant(safe-area-inset-bottom);
    }
  }
}
</style>
