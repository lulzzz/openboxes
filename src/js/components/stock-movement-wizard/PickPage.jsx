import React, { Component } from 'react';
import { reduxForm, formValueSelector, change } from 'redux-form';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';

import ArrayField from '../form-elements/ArrayField';
import LabelField from '../form-elements/LabelField';
import { renderFormField } from '../../utils/form-utils';
import ValueSelectorField from '../form-elements/ValueSelectorField';
import AdjustInventoryModal from './modals/AdjustInventoryModal';
import EditPickModal from './modals/EditPickModal';
import { showSpinner, hideSpinner } from '../../actions';
import TableRowWithSubfields from '../form-elements/TableRowWithSubfields';
import apiClient from '../../utils/apiClient';

const FIELDS = {
  pickPageItems: {
    type: ArrayField,
    rowComponent: TableRowWithSubfields,
    subfieldKey: 'picklistItems',
    fields: {
      productCode: {
        type: LabelField,
        label: 'Code',
        getDynamicAttr: ({ subfield }) => ({
          className: subfield ? 'text-center' : 'text-left ml-4',
        }),
      },
      'product.name': {
        type: LabelField,
        label: 'Product Name',
      },
      lotNumber: {
        type: LabelField,
        label: 'Lot #',
      },
      expirationDate: {
        type: LabelField,
        label: 'Expiry Date',
      },
      'binLocation.name': {
        type: LabelField,
        label: 'Bin',
      },
      quantityRequested: {
        type: LabelField,
        label: 'Qty required',
      },
      quantityPicked: {
        type: LabelField,
        label: 'Qty picked',
      },
      recipient: {
        type: ValueSelectorField,
        label: 'Includes recipient',
        attributes: {
          formName: 'stock-movement-wizard',
        },
        getDynamicAttr: ({ rowIndex }) => ({
          field: `pickPage[${rowIndex}].recipient`,
        }),
        component: LabelField,
        componentConfig: {
          getDynamicAttr: ({ selectedValue }) => ({
            className: selectedValue ? 'fa fa-user' : '',
          }),
        },
      },
      buttonEditPick: {
        label: 'Edit Pick',
        type: EditPickModal,
        fieldKey: '',
        attributes: {
          btnOpenText: 'Edit',
          title: 'Edit Pick',
        },
        getDynamicAttr: ({
          fieldValue, selectedValue, subfield, stockMovementId,
        }) => ({
          productCode: selectedValue,
          fieldValue,
          subfield,
          stockMovementId,
        }),
      },
      buttonAdjustInventory: {
        label: 'Adjust Inventory',
        type: AdjustInventoryModal,
        fieldKey: '',
        attributes: {
          btnOpenText: 'Adjust',
          title: 'Adjust Inventory',
        },
        getDynamicAttr: ({ fieldValue, selectedValue, subfield }) => ({
          product: selectedValue,
          fieldValue,
          subfield,
        }),
      },
    },
  },
};

/* eslint class-methods-use-this: ["error",{ "exceptMethods": ["print"] }] */
class PickPage extends Component {
  constructor(props) {
    super(props);

    this.state = { statusCode: '' };

    this.props.showSpinner();
  }

  componentDidMount() {
    this.fetchLineItems()
      .then((resp) => {
        const { statusCode, pickPageItems } = resp.data.data.pickPage;
        this.props.change('stock-movement-wizard', 'pickPageItems', pickPageItems);
        this.setState({ statusCode });
        this.props.hideSpinner();
      })
      .catch(() => this.props.hideSpinner());
  }

  print() {
    window.print();
  }

  fetchLineItems() {
    const url = `/openboxes/api/stockMovements/${this.props.stockMovementId}?stepNumber=4`;

    return apiClient.get(url)
      .then(resp => resp)
      .catch(err => err);
  }

  transitionToStep5() {
    const url = `/openboxes/api/stockMovements/${this.props.stockMovementId}/status`;
    const payload = { status: 'PICKED' };

    return apiClient.post(url, payload);
  }

  nextPage() {
    this.props.showSpinner();
    if (this.state.statusCode === 'PICKING') {
      this.transitionToStep5()
        .then(() => this.props.onSubmit())
        .catch(() => this.props.hideSpinner());
    } else {
      this.props.onSubmit();
    }
  }

  render() {
    return (
      <div>
        <button
          type="button"
          className="fa fa-print float-right p-2 mb-1 btn btn-secondary d-print-none"
          onClick={this.print}
        />
        <form onSubmit={this.props.handleSubmit(() => this.nextPage())} className="print-mt">
          {_.map(FIELDS, (fieldConfig, fieldName) => renderFormField(fieldConfig, fieldName))}
          <div className="d-print-none">
            <button type="button" className="btn btn-outline-primary" onClick={this.props.previousPage}>
              Previous
            </button>
            <button type="submit" className="btn btn-outline-primary float-right">Next</button>
          </div>
        </form>
      </div>
    );
  }
}

const selector = formValueSelector('stock-movement-wizard');

const mapStateToProps = state => ({
  stockMovementId: selector(state, 'requisitionId'),
});

export default reduxForm({
  form: 'stock-movement-wizard',
  destroyOnUnmount: false,
  forceUnregisterOnUnmount: true,
})(connect(mapStateToProps, { change, showSpinner, hideSpinner })(PickPage));

PickPage.propTypes = {
  change: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  showSpinner: PropTypes.func.isRequired,
  hideSpinner: PropTypes.func.isRequired,
  stockMovementId: PropTypes.string.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};
