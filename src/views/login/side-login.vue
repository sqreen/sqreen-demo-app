/**
* Created by vouill on 8/21/18.
*/

<template>
    <side-panel-container>
        <h3>Ressource by id page</h3>
        <p>This page has vulnerabilities!</p>
        <hidden-message title="Show vulnerability">
            <h4>Account take over</h4>
            <ul>
                <li>1. Retrieve a user email by any meaning (looking at comments for example)</li>
                <li>Can we get password from a pwned list?</li>
                <li>you can also the 5000 most common password against this email?</li>
            </ul>
            <AcountTakeOver/>
        </hidden-message>
    </side-panel-container>
</template>

<script>
import SidePanelContainer from "../../ui/side-panel-container";
import HiddenMessage from "../../ui/hidden-message";
import AcountTakeOver from "./AccountTakeOver";
export default {
  name: "SideResetPassword",
  components: { AcountTakeOver, HiddenMessage, SidePanelContainer }
};
</script>
