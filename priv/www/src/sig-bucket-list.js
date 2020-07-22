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
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/iron-icons/iron-icons.js';
import '@vaadin/vaadin-grid/vaadin-grid.js';
import '@vaadin/vaadin-grid/vaadin-grid-filter.js';
import '@vaadin/vaadin-grid/vaadin-grid-sorter.js';
import '@vaadin/vaadin-grid/vaadin-grid-column-group.js';
import '@polymer/paper-toast/paper-toast.js';
import './style-element.js'

class bucketList extends PolymerElement {
	static get template() {
		return html`
			<style include="style-element"></style>
			<vaadin-grid
					id="balanceBucketGrid"
					loading="{{loading}}"
					active-item="{{activeItem}}">
				<vaadin-grid-column width="15ex" flex-grow="5">
					<template class="header">
						<vaadin-grid-filter
								aria-label="Bucket Id"
								path="id"
								value="[[_filterBucId]]">
							<input
									placeholder="Bucket Id"
									value="{{_filterBucId::input}}"
									focus-target>
						</vaadin-grid-filter>
					</template>
					<template>[[item.id]]</template>
				</vaadin-grid-column>
				<vaadin-grid-column width="15ex" flex-grow="5">
					<template class="header">
						<vaadin-grid-filter
								aria-label="Product Id"
								path="product"
								value="[[_filterProdId]]">
							<input
									placeholder="Product Id"
									value="{{_filterProdId::input}}"
									focus-target>
					</vaadin-grid-filter>
				</template>
				<template>[[item.product]]</template>
				<vaadin-grid-column-group>
					<template class="header">
						<div class="grouptitle">Balance</div>
					</template>
					<vaadin-grid-column width="12ex" flex-grow="2">
						<template class="header">
								Cents
						</template>
						<template>
							<div class="cell numeric">[[item.cents]]</div>
						</template>
					</vaadin-grid-column>
					<vaadin-grid-column width="12ex" flex-grow="2">
						<template class="header">
								Bytes
						</template>
						<template>
							<div class="cell numeric">[[item.remainedAmount]]</div>
						</template>
					</vaadin-grid-column>
					<vaadin-grid-column width="12ex" flex-grow="2">
						<template class="header">
								Seconds
						</template>
						<template>
							<div class="cell numeric">[[item.seconds]]</div>
						</template>
					</vaadin-grid-column>
				</vaadin-grid-column-group>
			</vaadin-grid-column>
			<div class="add-button">
				<paper-fab
						icon="add"
						on-tap="showAddBucket">
				</paper-fab>
			</div>
			<iron-ajax
					id="getBucketBalance"
					url="/balanceManagement/v1/bucket/"
					rejectWithRequest>
			</iron-ajax>
		`;	
	}

	static get properties() {
		return {
			loading: {
				type: Boolean,
				notify: true
			},
			etag: {
				type: String,
				value: null
			},
			activeItem: {
				type: Object,
				notify: true,
				observer: '_activeItemChanged'
			},
			_filterBucId: {
				type: Boolean,
				observer: '_filterChanged'
			},
			_filterProdId: {
				type: Boolean,
				observer: '_filterChanged'
			}
		}
	}

	ready() {
		super.ready();
		var grid = this.shadowRoot.getElementById('balanceBucketGrid');
		grid.dataProvider = this._getBuckets;
	}

	_getBuckets(params, callback) {
		var grid = this;
		var bucketList = document.body.querySelector('sig-app').shadowRoot.querySelector('sig-bucket-list');
		var ajax = bucketList.shadowRoot.getElementById("getBucketBalance");
		delete ajax.params['filter'];
		function checkHead(param) {
			return param.path == "id" || param.path == "product";
		}
		params.filters.filter(checkHead).forEach(function(filter) {
			if (filter.value) {
				if(ajax.params['filter']) {
					ajax.params['filter'] += "]," + filter.path + ".like=[" + filter.value + "%";
				} else {
					ajax.params['filter'] = "\"[{" + filter.path + ".like=[" + filter.value + "%";
				}
			}
		});
		if (ajax.params['filter']) {
			ajax.params['filter'] += "]}]\"";
		}
		var handleAjaxResponse = function(request) {
			if(request) {
				bucketList.etag = request.xhr.getResponseHeader('ETag');
				var range = request.xhr.getResponseHeader('Content-Range');
				var range1 = range.split("/");
				var range2 = range1[0].split("-");
				if (range1[1] != "*") {
					grid.size = Number(range1[1]);
				} else {
					grid.size = Number(range2[1]) + grid.pageSize * 2;
				}
				var vaadinItems = new Array();
				function checkChar(characteristic){
					return characteristic.name == "id";
				}
				for (var index in request.response) {
					var newRecord = new Object();
					newRecord.id = request.response[index].id;
					if(request.response[index].product.id) {
						newRecord.product = request.response[index].product.id;
					}
					if(request.response[index].remainedAmount) {
						if(request.response[index].remainedAmount.units == "cents") {
							newRecord.cents = request.response[index].remainedAmount.amount;
						}
						if(request.response[index].remainedAmount.units == "seconds") {
							var Str = request.response[index].remainedAmount.amount;
							if(Str.includes("b")){
								var NewStrSec = Str.substring(0, Str.length - 1);
								newRecord.seconds = NewStrSec;
							}
						}
						if(request.response[index].remainedAmount.units == "octets") {
							var Str = request.response[index].remainedAmount.amount;
							if(Str.includes("b")){
								var NewStr = Str.substring(0, Str.length - 1);
								newRecord.remainedAmount = NewStr;
							}
						}
					}
					vaadinItems[index] = newRecord;
				}
				callback(vaadinItems);
			} else {
				grid.size = 0;
				callback([]);
			}
		};
		var handleAjaxError = function(error) {
			bucketList.etag = null;
			var toast = document.getElementById('userToastError');
			toast.text = error;
			toast.open();
			if(!grid.size) {
				grid.size = 0;
			}
			callback([]);
		}
		if (ajax.loading) {
			ajax.lastRequest.completes.then(function(request) {
			var startRange = params.page * params.pageSize + 1;
			var endRange = startRange + params.pageSize - 1;
			ajax.headers['Range'] = "items=" + startRange + "-" + endRange;
			if (bucketList.etag && params.page > 0) {
				ajax.headers['If-Range'] = bucketList.etag;
			} else {
				delete ajax.headers['If-Range'];
			}
			return ajax.generateRequest().completes;
			}, handleAjaxError).then(handleAjaxResponse, handleAjaxError);
		} else {
			var startRange = params.page * params.pageSize + 1;
			var endRange = startRange + params.pageSize - 1;
			ajax.headers['Range'] = "items=" + startRange + "-" + endRange;
			if (bucketList.etag && params.page > 0) {
				ajax.headers['If-Range'] = bucketList.etag;
			} else {
				delete ajax.headers['If-Range'];
			}
			ajax.generateRequest().completes.then(handleAjaxResponse, handleAjaxError);
		}
	}
}

window.customElements.define('sig-bucket-list', bucketList);

/*<dom-module id="sig-bucket-list">
			showAddBucket: function(event) {
				document.getElementById("addBucketModal").open();
			},
		});
	</script>
</dom-module>*/
