<script setup lang="ts">
import { reactive, watch, ref, computed, defineProps, defineEmits} from 'vue'

import { useStore } from './stores/counter'

interface ListItem {
    id: number
    count: number
}

const store = useStore()

const props = defineProps(['startcount'])
const emits = defineEmits(['change'])

const count = ref(parseFloat(props.startcount))
const c: number = props.startcount
const addid = ref(0)
const sliderval = ref(parseFloat(props.startcount))
const text = ref(props.startcount)
const list = ref(<ListItem[]>[])
const subtract = ref(false)

function addaddme() {
    let mult: number = subtract.value ? -1 : 1;
    console.log(count.value, text.value)
    count.value = count.value + parseFloat(text.value) * mult;
    const listitem = {id: addid.value, count: count.value};
    list.value.push(listitem)
    addid.value++;
    if (list.value.length > 10) {
        list.value.shift()
    }
    emits('change', count.value)
    if (props.startcount === "3"){
        store.countArray[0] = count.value
    } else {
        store.countArray[1] = count.value
    }
}

function subtractbtn(){
    subtract.value = !subtract.value
}

watch(sliderval, function(new_:number, old_:number) {
    text.value = new_.toString()
    addaddme()
})

const double = computed(() => count.value * 2)
</script>

<template>
<input v-model="text" id="addme">
<input type="range" v-model="sliderval" min="1" max="9" >
<p>
    {{ subtract ? "Subtract" : "Add" }}
</p>
<p>
    <button @click="subtractbtn">Switch sign</button>
    <button @click="addaddme">Modify</button>
</p>
<p>
    The count is "{{ count }}", which when doubled is "{{ double }}"
</p>
<p>
    <ul>
        <li v-for="litem of list" :key="litem.id">{{ litem.count }}</li>
    </ul>
</p>
</template>

<style scoped>
button {
    font-weight: bold;
    display: block;
}
input {
    display: block
}

</style>