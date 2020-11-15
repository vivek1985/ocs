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
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-tooltip/paper-tooltip.js';
import './style-element.js';

class tablePreAdd extends PolymerElement {
	static get template() {
		return html`
			<style include="style-element"></style>
			<paper-dialog id="addPrefixTableModal" modal>
				<app-toolbar>
					<h2>Add Table</h2>
				</app-toolbar>
				<paper-progress
						indeterminate
						class="slow red"
						disabled="{{!loading}}">
				</paper-progress>
				<paper-input
						id="addTableName"
						name="name"
						label="Name"
						value="{{addName}}">
				</paper-input>
				<paper-tooltip
						for="addTableName"
						offset="0">
					Table name
				</paper-tooltip>
				<paper-input
						id="addTableDesc"
						name="description"
						label="Description"
						value="{{addDesc}}">
				</paper-input>
				<paper-tooltip
						for="addTableDesc"
						offset="0">
					Table description
				</paper-tooltip>
				<paper-input
						id="addTableStart"
						value="{{startTableTimePick}}"
						name="startDate"
						label="Start Date">
				</paper-input>
				<paper-tooltip
						for="addTableStart"
						offset="0">
					Table start date time
				</paper-tooltip>
				<paper-input
						id="addTableEnd"
						value="{{endTableTimePick}}"
						name="endDate"
						label="End Date">
				</paper-input>
				<paper-tooltip
						for="addTableEnd"
						offset="0">
					Table end date time
				</paper-tooltip>
				<div class="buttons">
					<paper-button
							dialog-confirm
							raised
							on-tap="_tableAdd"
							class="submit-button">
						Submit
					</paper-button>
					<paper-button
							dialog-dismiss
							on-tap="_cancel"
							class="cancel-button">
						Cancel
					</paper-button>
				</div>
			</paper-dialog>
			<iron-ajax
					id="addTableAjax"
					url="/catalogManagement/v2/pla"
					method = "POST"
					content-type="application/json"
					loading="{{loading}}"
					on-response="_addTableResponse"
					on-error="_addTableError">
			</iron-ajax>
		`;
	}

	static get properties() {
		return {
			loading: {
				type: Boolean,
				value: false
			},
			addName: {
				type: String
			},
			addDesc: {
				type: String
			},
			startTableTimePick: {
				type: String
			},
			endTableTimePick: {
				type: String
			}
		}
	}

	_tableAdd(event) {
		var tabName = new Object();
		if(this.addName) {
			tabName.name = this.addName;
		}
		if(this.addDesc) {
			tabName.description = this.addDesc;
		}
		if(this.startTableTimePick) {
			var startDateTime = this.startTableTimePick;
		}
		if(this.endTableTimePick) {
			var endDateTime = this.endTableTimePick;
		}
		if(endDateTime < startDateTime) {
			var toast = document.body.querySelector('sig-app').shadowRoot.getElementById('restError');
			toast.text = "Error";
			toast.open();
		} else if(startDateTime && endDateTime) {
			tabName.validFor = {startDateTime, endDateTime};
		} else if(startDateTime && !endDateTime) {
			tabName.validFor = {startDateTime};
		} else if(!startDateTime && !endDateTime) {
			tabName.validFor = {endDateTime};
		}
		if(tabName.name) {
			var ajax = this.$.addTableAjax;
			ajax.body = tabName;
			ajax.generateRequest();
		}
		this.addName = null;
		this.addDesc = null;
		this.startTableTimePick = null;
		this.endTableTimePick = null;
	}

	_addTableResponse(event) {
		var results = event.detail.response;
		var tableRecord = new Object();
		tableRecord.id = results.id;
		tableRecord.href = results.href;
		tableRecord.plaSpecId = results.plaSpecId;
		document.body.querySelector('sig-app').shadowRoot.getElementById('offerList').push('tables', tableRecord);
		this.$.addPrefixTableModal.close();
	}

	_addTableError(event) {
		var toast = document.body.querySelector('sig-app').shadowRoot.getElementById('restError');
		toast.text = "Error";
		toast.open();
	}

	_cancel() {
		this.addName = null;
		this.addDesc = null;
		this.startTableTimePick = null;
		this.endTableTimePick = null;
	}
}

window.customElements.define('sig-prefix-table-add', tablePreAdd);
