import './styles/main.css';

import {
  APP_IDS,
  DEAL_FIELDS,
  CUSTOMER_FIELDS,
  CONTACT_FIELDS,
  RELATIONS,
  CONTACT_QUERY,
} from './config/fields.js';

import {
  initializeContactSelector,
} from './features/contactSelector.js';

import {
  initializeProposalDetails,
} from './features/proposalDetails.js';

(function () {
  'use strict';

  console.log('[SFA Customization] Config loaded', {
    APP_IDS,
    DEAL_FIELDS,
    CUSTOMER_FIELDS,
    CONTACT_FIELDS,
    RELATIONS,
    CONTACT_QUERY,
  });

  // 担当者別明細機能
  initializeProposalDetails();

  // 担当者選択機能の初期化
  initializeContactSelector();

  console.log(
    '[SFA Customization] initialized'
  );

})();
