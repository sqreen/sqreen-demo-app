/**
* Created by vouill on 8/20/18.
*/

<template>
  <div v-if="noTitleLink" class="post">
    <div class="img" :style="{backgroundImage: 'url('+picture+')'}"></div>
    <div class="right">
      <span class="title">{{postTitle}}</span>
      <span class="price">${{priceUSD}} - €{{price}}</span>
      <p>{{postContent}}</p>
      <div class="inline">
        <img src="https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/group-2.svg" alt="">
        <a href="">Add to cart</a>
      </div>
    </div>
  </div>
  <div v-else class="content">
    <div class="img" :style="{backgroundImage: 'url('+picture+')'}"></div>
    <div>
      <span class="title">{{postTitle}}</span>
      <span class="price">€{{price}}</span>
      <router-link :to="`post/${postId}`" append>Shop now</router-link>
    </div>
  </div>
</template>

<style lang="scss">
.content {
  background-color: #f7f7f7;
  padding: 40px;
  border-radius: 2px;
  display: flex;
  justify-content: center;
  align-content: center;
  align-items: center;
  margin-bottom: 10px;
  height: 446px;
  width: calc(25% - 20px);

  &:nth-child(n+2) {
    display: flex;
    flex-direction: column;

    .img {
      width: 200px;
      height: 400px;
      margin-bottom: 20px
    }

    .title {
      font-size: 27px !important;
    }

    a {
      display: block;
      margin: 0 auto;
      max-width: 150px;
      padding: 0 20px;
      text-align: center;
    }
  }

  &:nth-child(1) {
    width: calc(75% - 10px);

    .title {
      &::before {
        content: "NEW THIS WEEK";
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -0.22px;
        color: #acacac;
        display: block;
        margin-bottom: 10px;
      }
    }
  }

  &:nth-child(5n) {
    width: calc(50% - 10px) !important;
    flex-direction: row !important;
    
    .img {
      width: 350px;
      height: 400px;
      margin-bottom: 20px
    }

    .title {
      font-size: 27px !important;
    }

    a {
      display: block;
      margin: 0 auto 0 0;
      max-width: 150px;
      padding: 0 20px;
      text-align: center;
    }
  }

  .img {
    width: 400px;
    height: 350px;
    background-size: contain;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
    background-color: #f7f7f7;
    background-position: center;
  }

  .title {
    font-size: 38px;
    font-weight: 500;
    letter-spacing: -0.36px;
    color: #333;
    display: block;
    line-height: 1;
    margin-bottom: 3px;
  }

  .price {
    font-size: 38px;
    font-weight: 900;
    line-height: normal;
    letter-spacing: -0.5px;
    color: #333;
    position: relative;
    display: block;
    margin-bottom: 20px;

    &::after {
      content: "99";
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.29px;
      color: #ff5a6e;
      display: inline-block;
      vertical-align: super;
    }
  }

  a {
    height: 40px;
    border-radius: 3px;
    background-color: #ff5a6e;
    display: inline-block;
    line-height: 40px;
    padding: 0 40px;
    color: #fff;
    text-transform: uppercase;
    font-weight: 600;
    font-size: 14px;
  }
}

.post {
  display: flex;
  justify-content: center;
  align-content: center;
  align-items: center;
  width: 100%;
  margin-top: 40px;

  .img {
    background-color: #f7f7f7;
    width: 50%;
    height: 446px;
    background-size: 350px auto;
    background-repeat: no-repeat;
    background-blend-mode: multiply;
    background-color: #f7f7f7;
    background-position: center;
  }

  .right {
    width: 50%;
    padding: 0 30px;
    text-align: left;
  }

  .title {
    font-size: 38px;
    font-weight: 500;
    letter-spacing: -0.36px;
    color: #333;
    display: block;
    line-height: 1;
    margin-bottom: 3px;
  }

  .price {
    font-size: 38px;
    font-weight: 900;
    line-height: normal;
    letter-spacing: -0.5px;
    color: #333;
    position: relative;
    display: block;
    margin-bottom: 20px;

    &::after {
      content: "99";
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.29px;
      color: #ff5a6e;
      display: inline-block;
      vertical-align: super;
    }
  }

  p {
    font-size: 18px;
    font-weight: 300;
    line-height: 1.44;
    color: #333;
    margin-bottom: 20px;
  }

  .inline {
    & > * {
      display: inline-block;
      vertical-align: middle;
    }

    img {
      margin-right: 10px;
    }
  }

  a {
    height: 53px;
    border-radius: 3px;
    background-color: #ff5a6e;
    display: inline-block;
    line-height: 53px;
    padding: 0 40px;
    color: #fff;
    text-transform: uppercase;
    font-weight: 900;
    font-size: 18px;
  }
}
</style>

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
    priceUSD: function() {
      return this.post.priceUSD || this.post.PRICE_USD;
    },
    postTitle: function() {
      return this.post.title || this.post.TITLE;
    },
    picture: function() {
      return this.post.picture || this.post.PICTURE;
    }
  },
  data() {
    return {};
  }
};
</script>
