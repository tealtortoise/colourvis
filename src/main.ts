import { createApp } from "vue";
import { createPinia, defineStore } from "pinia";

// import App from "./Test.vue";
import App from "./parent.vue";
// import router from "./router";

const app = createApp(App);

app.use(createPinia());
// app.use(router);

export const useStore = defineStore('counter', {
    state: () => {
      return { count: 0 }
    },
    // could also be defined as
    // state: () => ({ count: 0 })
    actions: {
      increment() {
      },
    },
  })
  

app.mount("#app");
