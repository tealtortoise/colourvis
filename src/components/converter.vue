<script setup lang="ts">
import { ref, computed, watch } from 'vue'

let k = 298.15
let c = k - 273.15
let f = c * 9 / 5 + 32

const kref = ref(k)
const kelvin = ref(k.toFixed(2))
const celsius = ref(c.toFixed(2))
const fahrenheit = ref(f.toFixed(2))
const log = ref("")

function formatNumber(n: number, places:number=2) :string {
    return parseFloat(n.toFixed(places)).toString()
}
let lastUpdate = kelvin

function updateC (){
    console.log(lastUpdate)
    const input = Number(celsius.value)
    if (!isNaN(input)) {
        kref.value = input + 273.15
    }
    lastUpdate = celsius
}
function updateF (){
    const input = Number(fahrenheit.value)
    if (!isNaN(input)) {
        kref.value = (input - 32) * 5 / 9 + 273.15
    }
    lastUpdate = fahrenheit
}

watch(kref, (val, oldVal) => {
    k = kref.value
    c = k - 273.15
    f = c * 9 / 5 + 32
    if (lastUpdate != fahrenheit) { fahrenheit.value = formatNumber(f)}
    if (lastUpdate != celsius) { celsius.value = formatNumber(c) }
    if (lastUpdate != kelvin) { kelvin.value = formatNumber(k) }
    lastUpdate = kref
})

function updateK(){
    const input = Number(kelvin.value)
    if (!isNaN(input)) {
        kref.value = input
        // kelvin.value = parseFloat(input.toFixed(2)).toString()
    }
    lastUpdate = kelvin
}

</script>

<template>
<h1>Unit Converter</h1>`
<p>Log: {{ log }}</p>
<p>
    <input type="range" v-model.number="kref" min="0" max="400" >
</p>

<label>Kelvin</label>
<input v-model="kelvin" @input="updateK()">
<label>Celsius</label>
<input v-model="celsius" @input="updateC()">

<label>Fahrenheit</label>
<input v-model="fahrenheit" @input="updateF()">
<p> Kelvin: {{ kelvin }}K</p>
</template>

<style scoped>
</style>
