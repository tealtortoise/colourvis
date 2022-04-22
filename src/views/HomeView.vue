<script setup lang="ts">
import TheWelcome from "@/components/TheWelcome.vue";
</script>

<template>
  <main>
    <TheWelcome />
    
      
  <button @click="count++">
    Count is: {{ count }}
  </button>
  </main>
</template>
