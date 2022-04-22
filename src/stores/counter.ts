import { defineStore } from "pinia";

export const useStore = defineStore({
  id: "counter",
  state: () => ({
    counter: 11,
    counter2: 12,
    countArray: <number[]>[],
  }),
  getters: {
    doubleCount: (state) => state.counter * 2,
    countSum: (state) => state.countArray.reduce((partialSum, a) => partialSum + a, 0)
  },
  actions: {
    increment() {
      this.counter++;
    },
  },
});
