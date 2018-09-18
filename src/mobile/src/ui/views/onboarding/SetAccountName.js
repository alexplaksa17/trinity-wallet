import isEmpty from 'lodash/isEmpty';
import trim from 'lodash/trim';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { Keyboard, StyleSheet, View, Text, TouchableWithoutFeedback, Clipboard } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { generateAlert } from 'shared-modules/actions/alerts';
import { setAdditionalAccountInfo } from 'shared-modules/actions/wallet';
import { connect } from 'react-redux';
import { shouldPreventAction } from 'shared-modules/selectors/global';
import { getAccountNamesFromState } from 'shared-modules/selectors/accounts';
import { VALID_SEED_REGEX } from 'shared-modules/libs/iota/utils';
import DynamicStatusBar from 'ui/components/DynamicStatusBar';
import CustomTextInput from 'ui/components/CustomTextInput';
import StatefulDropdownAlert from 'ui/components/StatefulDropdownAlert';
import OnboardingButtons from 'ui/components/OnboardingButtons';
import { width, height } from 'libs/dimensions';
import Vault from 'libs/vault';
import InfoBox from 'ui/components/InfoBox';
import { Icon } from 'ui/theme/icons';
import GENERAL from 'ui/theme/general';
import Header from 'ui/components/Header';
import { leaveNavigationBreadcrumb } from 'libs/bugsnag';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: height / 16,
    },
    midContainer: {
        flex: 3,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width,
    },
    bottomContainer: {
        flex: 0.5,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    infoText: {
        fontFamily: 'SourceSansPro-Light',
        fontSize: GENERAL.fontSize3,
        textAlign: 'left',
        paddingTop: height / 60,
        backgroundColor: 'transparent',
    },
});

/** Set Account Name component */
export class SetAccountName extends Component {
    static propTypes = {
        /** Component ID */
        componentId: PropTypes.object.isRequired,
        /** @ignore */
        accountNames: PropTypes.array.isRequired,
        /** @ignore */
        generateAlert: PropTypes.func.isRequired,
        /** @ignore */
        setAdditionalAccountInfo: PropTypes.func.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        seed: PropTypes.string.isRequired,
        /** @ignore */
        onboardingComplete: PropTypes.bool.isRequired,
        /** @ignore */
        theme: PropTypes.object.isRequired,
        /** @ignore */
        password: PropTypes.object.isRequired,
        /** Determines whether to prevent new account setup */
        shouldPreventAction: PropTypes.bool.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            accountName: this.getDefaultAccountName(),
        };
    }

    async componentDidMount() {
        leaveNavigationBreadcrumb('SetAccountName');
        const { t } = this.props;
        const clipboardContent = await Clipboard.getString();
        if (clipboardContent.match(VALID_SEED_REGEX)) {
            Clipboard.setString(' ');
            this.props.generateAlert(
                'info',
                t('copyToClipboard:seedCleared'),
                t('copyToClipboard:seedClearedExplanation'),
            );
        }
    }

    /**
     * Navigates to loading screen and fetches seed information from the Tangle
     * @method onDonePress
     */
    async onDonePress() {
        const { t, onboardingComplete, accountNames, seed, password, shouldPreventAction } = this.props;
        const accountName = trim(this.state.accountName);

        if (shouldPreventAction) {
            return this.props.generateAlert('error', t('global:pleaseWait'), t('global:pleaseWaitExplanation'));
        }

        if (isEmpty(accountName)) {
            return this.props.generateAlert(
                'error',
                t('addAdditionalSeed:noNickname'),
                t('addAdditionalSeed:noNicknameExplanation'),
            );
        }

        if (accountNames.map((item) => item.toLowerCase()).indexOf(accountName.toLowerCase()) > -1) {
            return this.props.generateAlert(
                'error',
                t('addAdditionalSeed:nameInUse'),
                t('addAdditionalSeed:nameInUseExplanation'),
            );
        }

        if (onboardingComplete) {
            const vault = new Vault.keychain(password);
            const isSeedUnique = await vault.uniqueSeed(seed);
            if (!isSeedUnique) {
                return this.props.generateAlert(
                    'error',
                    t('addAdditionalSeed:seedInUse'),
                    t('addAdditionalSeed:seedInUseExplanation'),
                );
            }
        }

        this.props.setAdditionalAccountInfo({
            addingAdditionalAccount: true,
            additionalAccountName: accountName,
            additionalAccountType: 'keychain',
            usedExistingSeed: false,
        });

        if (!onboardingComplete) {
            this.navigateTo('setPassword');
        } else {
            const vault = new Vault.keychain(password);
            vault.accountAdd(accountName, seed);
            this.navigateTo('loading');
        }
    }

    /**
     * Pops the active screen from the navigation stack
     * @method onBackPress
     */
    onBackPress() {
        Navigation.pop(this.props.componentId);
    }

    /**
     * Gets a default account name
     *
     * @method getDefaultAccountName
     * @returns {*}
     */
    getDefaultAccountName() {
        const { t, accountNames } = this.props;
        return accountNames.length === 0 ? t('global:mainWallet') : '';
    }

    /**
     * Navigates to the provided screen name
     * @method navigateTo
     * @param {string} screen
     */
    navigateTo(screen) {
        const { theme: { body } } = this.props;
        Navigation.push('appStack', {
            component: {
                name: screen,
                options: {
                    animations: {
                        push: {
                            enable: false,
                        },
                        pop: {
                            enable: false,
                        },
                    },
                    layout: {
                        backgroundColor: body.bg,
                        orientation: ['portrait'],
                    },
                    topBar: {
                        visible: false,
                        drawBehind: true,
                        elevation: 0,
                    },
                    statusBar: {
                        drawBehind: true,
                        statusBarColor: body.bg,
                    },
                },
            },
        });
    }

    render() {
        const { accountName } = this.state;
        const { t, theme } = this.props;
        const textColor = { color: theme.body.color };

        return (
            <View style={[styles.container, { backgroundColor: theme.body.bg }]}>
                <DynamicStatusBar backgroundColor={theme.body.bg} />
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View>
                        <View style={styles.topContainer}>
                            <Icon name="iota" size={width / 8} color={theme.body.color} />
                            <View style={{ flex: 0.7 }} />
                            <Header textColor={theme.body.color}>{t('letsAddName')}</Header>
                        </View>
                        <View style={styles.midContainer}>
                            <View style={{ flex: 0.15 }} />
                            <CustomTextInput
                                label={t('addAdditionalSeed:accountName')}
                                onChangeText={(text) => this.setState({ accountName: text })}
                                containerStyle={{ width: width / 1.15 }}
                                autoCapitalize="words"
                                autoCorrect={false}
                                enablesReturnKeyAutomatically
                                returnKeyType="done"
                                onSubmitEditing={() => this.onDonePress()}
                                theme={theme}
                                value={accountName}
                            />
                            <View style={{ flex: 0.3 }} />
                            <InfoBox
                                body={theme.body}
                                text={
                                    <View>
                                        <Text style={[styles.infoText, textColor]}>{t('canUseMultipleSeeds')}</Text>
                                        <Text style={[styles.infoText, textColor]}>{t('youCanAdd')}</Text>
                                    </View>
                                }
                            />
                            <View style={{ flex: 0.5 }} />
                        </View>
                        <View style={styles.bottomContainer}>
                            <OnboardingButtons
                                onLeftButtonPress={() => this.onBackPress()}
                                onRightButtonPress={() => this.onDonePress()}
                                leftButtonText={t('global:goBack')}
                                rightButtonText={t('global:done')}
                                leftButtonTestID="setSeedName-back"
                                rightButtonTestID="setSeedName-done"
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
                <StatefulDropdownAlert backgroundColor={theme.body.bg} />
            </View>
        );
    }
}

const mapStateToProps = (state) => ({
    seed: state.wallet.seed,
    accountNames: getAccountNamesFromState(state),
    onboardingComplete: state.accounts.onboardingComplete,
    theme: state.settings.theme,
    shouldPreventAction: shouldPreventAction(state),
    password: state.wallet.password,
});

const mapDispatchToProps = {
    generateAlert,
    setAdditionalAccountInfo,
};

export default translate(['setSeedName', 'global', 'addAdditionalSeed'])(
    connect(mapStateToProps, mapDispatchToProps)(SetAccountName),
);
