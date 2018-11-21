/**
* Created by vouill on 8/20/18.
*/

<template>
    <div class="content">
        <h1 v-if="noTitleLink">{{postTitle}} - {{price}}</h1>
        <h1 v-else><router-link :to="`post/${postId}`" append>{{postTitle}}</router-link></h1>
        <p>{{postContent}}</p>
    </div>
</template>

<script>
export default {
  name: "post",
  props: { post: Object, noTitleLink: Boolean },
  computed: {
    postId: function() {
      return this.post.id || this.post.ID;
    },
    price: function() {
      return this.post.price || this.post.PRICE;
    },
    postTitle: function() {
      return this.post.title || this.post.TITLE;
    },
    postContent: function() {
      return this.post.content || this.post.CONTENT;
    }
  },
  data() {
    return {};
  }
};
</script>
