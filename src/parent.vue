<script setup lang="ts">
import { reactive, watch, ref, computed } from 'vue'
import { useStore } from './stores/counter'
import Test from "./Test.vue"
import Converter from './components/converter.vue'
import XYCanvas from './components/xycanvas.vue'

// let inst = ref(null)
const text = ref("")

// text.value=inst
const currentVal = ref(0)
const store = useStore()

function blarp(refe:number, val: number){
    // console.log("blarp", val)
    // store[refe] = val
    // currentVal.value = sstore[1] + store[2]
}

function logState(){
    // currentVal.value = useStore.countArray[0] + useStore.countArray[1]
    
    currentVal.value = store.countSum
    // console.log(99, )
}
</script>
<template>
<XYCanvas></XYCanvas>
<Converter></Converter>
<h1>
    Value: {{ currentVal }}
</h1>
<p>
    <button @click="logState()">Get state</button>
</p>
<Test ref="inst" startcount=3 @change_="(val: number) => blarp(1, val)"></Test>
<Test ref="inst2" startcount=5 @change_="(val: number) => blarp(2, val)"></Test>
<p>
    THis is fun, right?
</p>
<p>
    {{ text}}dfsdf
</p>
</template>