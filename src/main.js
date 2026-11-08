import './styles/main.css';

import {
  DEAL_FIELDS,
  CUSTOMER_FIELDS,
  CONTACT_FIELDS,
  RELATIONS,
  CONTACT_QUERY,
} from './config/fields.js';

import { initializeContactSelector, } from './features/contactSelector.js';
import { initializeProposalDetails, } from './features/proposalDetails.js';
import { initializeProposalCopy } from './features/proposalCopy.js';

(function () {
  'use strict';

  console.log('[SFA Customization] Config loaded', {
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

  // テーブルコピー機能情報の初期化
  initializeProposalCopy();

  console.log(
    '[SFA Customization] initialized'
  );

})();
