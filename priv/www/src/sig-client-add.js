/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-checkbox/paper-checkbox.js'
import './style-element.js';

class clientAdd extends PolymerElement {
	static get template() {
		return html`
			<style include="style-element"></style>
			<paper-dialog class="dialog" id="clientAddModal" modal>
				<app-toolbar>
					<div main-title>Add Client</div>
				</app-toolbar>
				<paper-progress
						indeterminate
						class="slow red"
						disabled="{{!loading}}">
				</paper-progress>
				<paper-input
						id="addClientAddress"
						name="address"
						label="IP Address"
						allowed-pattern="[0-9\.]"
						value="{{address}}"
						required>
				</paper-input>
				<paper-dropdown-menu
						class="drop"
						label="Protocol"
						value="{{clientProto}}"
						on-selected-item-changed="checkProto">
					<paper-listbox
							id="addClientProtocol"
							slot="dropdown-content"
							selected="0">
						<paper-item>
								RADIUS
						</paper-item>
						<paper-item>
								DIAMETER
						</paper-item>
					</paper-listbox>
				</paper-dropdown-menu>
				<iron-collapse id="addClientRadiusHide">
					<paper-input
							id="addClientSecret"
							class="secret"
							name="secret"
							value="{{clientSecret}}"
							label="Secret">
					</paper-input>
					<div class="generate">
						<paper-checkbox
								id="check"
								on-change="checkboxchanged">
								Generate
						</paper-checkbox>
					</div>
					<paper-input
							id="addClientPort"
							name="port"
							label="Port"
							type="number"
							value=3799>
					</paper-input>
					<paper-checkbox
							class="passwordless"
							value="{{checkPasswordless}}"
							id="checkPass">
						Passwordless
					</paper-checkbox>
				</iron-collapse>
				<div class="buttons">
					<paper-button
							raised
							class="submit-button"
							on-tap="_addClientSubmit">
						Add
					</paper-button>
					<paper-button
							class="cancel-button"
							dialog-dismiss
							on-tap="cancelDialogClient">
						Cancel
					</paper-button>
				</div>
			</paper-dialog>
			<paper-dialog id="addClientSecretModal" class="generated" modal>
				<app-toolbar>
					<h2>Server Generated</h2>
				</app-toolbar>
				<paper-item>
					<paper-item-body two-line>
						<div>
							<iron-icon icon="my-icons:vpn" item-icon></iron-icon>
								Secret:
						</div>
						<div secondary>
								[[secret]]
						</div>
					</paper-item-body>
				</paper-item>
				<div class="close">
					<paper-button dialog-confirm autofocus>
							Close
					</paper-button>
				</div>
			</paper-dialog>
			<iron-ajax
					id="addClientAjax"
					url="/ocs/v1/client"
					method = "post"
					content-type="application/json"
					on-loading-changed="_onLoadingChanged"
					on-response="_addClientResponse"
					on-error="_addClientError">
			</iron-ajax>
		`;
	}

	static get properties() {
		return {
			loading: {
				type: Boolean,
				value: false
			},
			address: {
				type: String
			},
			clientSecret: {
				type: String
			},
			checkPasswordless: {
				type: Boolean
			}
		}
	}

	ready() {
		super.ready()
	}

	_addClientSubmit() {
		var client = new Object();
		client.id = this.address;
		if (this.clientProto == "DIAMETER") {
			client.protocol = "DIAMETER";
		} else {
			client.protocol = "RADIUS";
			client.port = parseInt(this.$.addClientPort.value);
			if (this.$.addClientSecret.disabled == false) {
				client.secret = this.clientSecret;
			}
			if (this.$.checkPass.checked == true) {
				client.passwordRequired = false;
			}
		}
		var ajax = this.$.addClientAjax;
		ajax.body = client;
		if(this.clientProto == "RADIUS") {
			if (this.clientSecret || this.$.check.checked) {
				ajax.generateRequest();
			}
		} else if(this.clientProto == "DIAMETER") {
			ajax.generateRequest();
		}
	}

	checkProto() {
		if(this.clientProto == "RADIUS") {
			this.$.addClientRadiusHide.show();
		} else if(this.clientProto == "DIAMETER") {
			this.$.addClientRadiusHide.hide();
		}
	}

	checkboxchanged(event) {
		if (event.target.checked) {
			this.$.addClientSecret.disabled = true;
		} else {
			this.$.addClientSecret.disabled = false;
		}
	}

	_addClientResponse() {
		this.$.clientAddModal.close();
		if ((this.$.addClientAjax.body.secret == undefined)
					&& this.$.addClientAjax.lastResponse.secret) {
			this.secret = this.$.addClientAjax.lastResponse.secret;
			this.$.addClientSecretModal.open();
		}
		document.body.querySelector('sig-app').shadowRoot.getElementById('clientList').shadowRoot.getElementById('clientGrid').clearCache();
	}

	cancelDialogClient() {
		this.address = null;
		this.clientProto = null;
		this.clientSecret = null;
		this.$.addClientModal.close();
	}

	_addClientError(event) {
		this.$.addClientToastError.text = event.detail.request.xhr.statusText;
		this.$.addClientToastError.open();
	}
}

window.customElements.define('sig-client-add', clientAdd);

