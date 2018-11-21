/**
* Created by vouill on 8/21/18.
*/

<template>
    <article class="message">
        <div @click="show = !show" class="message-header">
            <p>{{title}}</p>
            <button class="delete" aria-label="delete"></button>
        </div>
        <div v-if="show" class="message-body">
            <slot/>
        </div>
    </article>
</template>

<style scoped>
.message-header {
  cursor: pointer;
  user-select: none;
}
</style>

<script>
export default {
  name: "hidden-message",
  props: { title: String },
  components: {},
  data() {
    return {
      show: false
    };
  }
};
</script>
