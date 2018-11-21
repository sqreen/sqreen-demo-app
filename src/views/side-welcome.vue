/**
* Created by vouill on 8/21/18.
*/

<template>
    <side-panel-container>
        <h1>Welcome!</h1>
        <h3>First steps:</h3>
        <p>You are now viewing our demo app!</p>
        <ul>
            <li><strong>1. </strong> Make sure to first <a target="_blank" rel="noopener noreferrer" href="https://my.sqreen.io/application/goto/instructions">connect</a> this app by connecting it to sqreen using your sqreen token.</li>
        </ul>
        <p>Now that you have connected your app, let's see what we can do :)</p>
        <h3>What is this application?</h3>
        <p>You are a small shop and you have products available.</p>
        <p>
            <strong>This app has vulnerabilities.</strong><br/>
            You can try to find them by yourself !<br/>
            Or follow what we say in this side panel throughout the all app :)
        </p>
        <p>Here is the route map: </p>
        <ul>
            <li> <code>/</code> - list all products</li>
            <li> <code>/post/:id</code> - specific product view</li>
            <li> <code>/login</code> - specific product view</li>
            <li> <code>/reset-password/:token</code> - specific product view</li>
        </ul>
        <!--<hidden-message title="Crawling issue">
            <h3>Crawlers</h3>
            <p>Because the app has no rate limiting, it's easy to crawl all the items and have a price table of all your products</p>
            <h4>Perform a crawl</h4>
            <network-request-performer url="/posts/:id" until="400"/>
            <h3>How can sqreen block it ?</h3>
            <p>You can create a playbook to block any crawlers.</p>
            <p>The logic would be the following</p>
            <ul>
                <li>When an ip retrieve more than 300 products info in under 5 minutes</li>
                <li>Block the IP</li>
            </ul>
        </hidden-message>-->
        <hidden-message title="Scanner issue">
            <h3>Scanners</h3>
            <h4>Perform a scan</h4>
            <network-scanner/>
        </hidden-message>
    </side-panel-container>
</template>

<script>
import SidePanelContainer from "../ui/side-panel-container";
import HiddenMessage from "../ui/hidden-message";
import NetworkRequestPerformer from "./NetworkRequestPerformer";
import NetworkScanner from "./NetworkScanner";

export default {
  name: "Welcome",
  components: {
    NetworkScanner,
    NetworkRequestPerformer,
    HiddenMessage,
    SidePanelContainer
  }
};
</script>
