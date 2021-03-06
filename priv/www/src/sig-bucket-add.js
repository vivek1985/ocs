/**
 * Copyright 2016 - 2021 SigScale Global Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-progress/paper-progress.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js'
import '@polymer/paper-tooltip/paper-tooltip.js';
import './style-element.js';

class offerAdd extends PolymerElement {
	static get template() {
		return html`
			<style include="style-element"></style>
			<paper-dialog
					class="dialog"
					id="addBucketModal"
					modal>
				<app-toolbar>
					<h3>Add Bucket</h3>
				</app-toolbar>
				<paper-progress
						indeterminate
						id="progressId"
						class="slow red"
						disabled="{{!loading}}">
				</paper-progress>
				<paper-input
						id="addProduct"
						name="product"
						value="{{proProduct}}"
						label="Product">
				</paper-input>
				<paper-tooltip
						for="addProduct"
						offset="0">
					Product Name
				</paper-tooltip>
				<div>
					<paper-dropdown-menu
							id="proBucUnit"
							value="{{proUnit}}"
							no-animations="true"
							label="Units">
						<paper-listbox
								id="addUnitsBucket"
								slot="dropdown-content">
							<paper-item>
									Bytes
							</paper-item>
							<paper-item>
									Cents
							</paper-item>
							<paper-item>
									Seconds
							</paper-item>
						</paper-listbox>
					</paper-dropdown-menu>
					<paper-tooltip
							for="proBucUnit"
							offset="0">
						Select units from dropdown list ("Bytes | Cents | Seconds")
					</paper-tooltip>
				</div>
				<paper-input
						id="amount"
						name="amount"
						type="text"
						allowed-pattern="[0-9kmg]"
						pattern="^[0-9]+[kmg]?$"
						label="Amount"
						value="{{proAmount}}"
						auto-validate>
				</paper-input>
				<paper-tooltip
						for="amount"
						offset="0">
					Add bucket amount value
				</paper-tooltip>
				<div class="buttons">
					<paper-button
							raised
							class="submit-button"
							on-tap="_bucketAddSubmit">
						Add
					</paper-button>
					<paper-button dialog-dismiss
							class="cancel-button"
							on-tap="canBucket">
						Cancel
					</paper-button>
				</div>
			</paper-dialog>
			<paper-dialog
					class="dialog"
					id="deleteBucketModal" modal>
				<app-toolbar>
					<h2>Delete Bucket</h2>
				</app-toolbar>
				<paper-input
						id="deleteBucId"
						value="{{delBuc}}"
						name="BucketId"
						label="Bucket Id"
						required
						disabled>
				</paper-input>
				<paper-tooltip
						for="deleteBucId"
						offset="0">
					Bucket id
				</paper-tooltip>
				<div class="buttons">
					<paper-button raised
							id="bucDelButton"
							on-tap="bucketDelete"
							class="delete-button">
						Delete
					</paper-button>
					<paper-button dialog-dismiss
							class="cancel-button"
							onclick="deleteBucketModal.close()">
						Cancel
					</paper-button>
				</div>
			</paper-dialog>
			<iron-ajax
					id="deleteBucketAjax"
					url="/balanceManagement/v1/bucket/"
					method="delete"
					on-response="_deleteBucketResponse"
					on-error="_deleteBucketError">
			</iron-ajax>
			<iron-ajax
					id="addBucketAjax"
					method = "post"
					content-type="application/json"
					on-loading-changed="_onLoadingChanged"
					on-response="_addBucketResponse"
					on-error="_addBucketError">
			</iron-ajax>
		`;
	}

	static get properties() {
		return {
				loading: {
				type: Boolean,
				value: false
			},
			proProduct: {
				type: String
			},
			proAmount: {
				type: String
			},
			delBuc: {
				type: String
			}
		}
	}

	ready() {
		super.ready()
	}

	bucketDelete(event) {
		var delBucket = this.delBuc;
		var deleteAjax = this.$.deleteBucketAjax;
		deleteAjax.url = "/balanceManagement/v1/bucket/" + delBucket;
		deleteAjax.generateRequest();
	}

	_deleteBucketError(event) {
		var toast = document.body.querySelector('sig-app').shadowRoot.getElementById('restError');
		toast.text = "Error";
		toast.open();
	}

	_deleteBucketResponse(event) {
		this.$.deleteBucketModal.close();
		document.body.querySelector('sig-app').shadowRoot.querySelector('sig-bucket-list').shadowRoot.getElementById('balanceBucketGrid').clearCache();
	}

	_bucketAddSubmit(event) {
		var ajaxBucket = this.$.addBucketAjax;
		var bucketTop = {name: "channel"};
		var bucketUnits;
		var bucketAmount;
		if(this.proAmount) {
			if(this.proUnit == "Bytes") {
				bucketUnits = "octets";
			}
			else if(this.proUnit == "Cents") {
				bucketUnits = "cents";
			}
			else if(this.proUnit == "Seconds") {
				bucketUnits = "seconds";
			} else {
				bucketUnits = "cents";
			}
			if(bucketUnits && this.proAmount) {
				var size = this.proAmount;
				var len = size.length;
				var m = size.charAt(len - 1);
				if(isNaN(parseInt(m))) {
					var s = size.slice(0, (len - 1));
				} else {
						var s = size;
				}
				if(bucketUnits == "octets") {
					if (m == "m") {
						bucketAmount = s + "000000b";
					} else if(m == "g") {
						bucketAmount = s + "000000000b";
					} else if(m == "k") {
						bucketAmount = s + "000b";
					} else {
						bucketAmount = s + "b";
					}
				} else if(bucketUnits == "cents") {
					bucketAmount = this.proAmount; 
				} else if(bucketUnits == "seconds") {
					var n = Number(s);
					if(m == "m") {
						n = n * 60;
						bucketAmount = n.toString() + "s";
					} else if(m == "h") {
						n = n * 3600;
						bucketAmount = n.toString() + "s";
					} else {
						bucketAmount = n.toString() + "s";
					}
				}
			bucketTop.amount = {units: bucketUnits, amount: bucketAmount};
			}
		}
		var proId = this.proProduct;
		bucketTop.product = {id: proId,
					href: "/productInventoryManagement/v2/product/" + proId};
		ajaxBucket.headers['Content-type'] = "application/json";
		ajaxBucket.body = bucketTop;
		ajaxBucket.url="/balanceManagement/v1/product/" + proId + "/balanceTopup";
		ajaxBucket.generateRequest();
		this.$.addBucketModal.close();
		this.proAmount = null;
		this.$.addProduct.value = null;
		this.$.addUnitsBucket.value = null;
	}

	canBucket() {
		this.proAmount = null;
		this.$.addProduct.value = null;
		this.$.addUnitsBucket.value = null;
	}

	_addBucketResponse(event) {
		this.$.addBucketModal.close();
		document.body.querySelector('sig-app').shadowRoot.getElementById('bucketList').shadowRoot.getElementById('balanceBucketGrid').clearCache();
	}

	_addBucketError(event) {
		var toast = document.body.querySelector('sig-app').shadowRoot.getElementById('restError');
		toast.text = "Error";
		toast.open();
	}

	_onLoadingChanged(event) {
		if (this.$.addBucketAjax.loading) {
			this.$.progressId.disabled = false;
		} else {
			this.$.progressId.disabled = true;
		}
	}
}

window.customElements.define('sig-bucket-add', offerAdd);
