import { AccessToken, ResourceOwnerPassword } from 'simple-oauth2'
import axios, { Method } from 'axios'
import { Agent } from 'https'
import {
    ACMode,
    AddEnergiIQMeterReadingResponse,
    AirComfort,
    AirComfortDetailed,
    AwayConfiguration,
    Country,
    DeepPartial,
    Device,
    EnergyIQ,
    EnergyIQMeterReadings,
    EnergySavingReport,
    FanSpeed,
    HeatingCircuit,
    Home,
    IQUnit,
    Me,
    MobileDevice,
    MobileDeviceSettings,
    Power,
    State,
    StatePresence,
    Temperature,
    Termination,
    TimeTable,
    TimeTableSettings,
    TimeTables,
    User,
    Weather,
    Zone,
    ZoneCapabilities,
    ZoneDayReport,
    ZoneOverlay,
    ZoneState,
    ZoneStates,
    ZoneControl,
    RunningTimes,
    RunningTimeAggregation,
    RunningTimesSummaryOnly,
} from './types'

export * from './types'

const EXPIRATION_WINDOW_IN_SECONDS = 300

const tado_auth_url = 'https://auth.tado.com'
const tado_url = 'https://my.tado.com'
const tado_config = {
    client: {
        id: 'tado-web-app',
        secret: 'wZaRN7rpjn3FoNyF5IFuxg9uMzYJcvOoQ8QWiIqS3hfk6gLhVlG57j5YNoZL2Rtc',
    },
    auth: {
        tokenHost: tado_auth_url,
    },
}

const client = new ResourceOwnerPassword(tado_config)

export class Tado {
    private _httpsAgent: Agent
    private _accessToken?: AccessToken | null
    private _username?: string
    private _password?: string

    constructor(username?: string, password?: string) {
        this._username = username
        this._password = password
        this._httpsAgent = new Agent({ keepAlive: true })
    }

    private async _login() {
        if (!this._username || !this._password) {
            throw new Error('Please login before using Tado!')
        }

        const tokenParams = {
            username: this._username,
            password: this._password,
            scope: 'home.user',
        }

        try {
            this._accessToken = await client.getToken(tokenParams)
        } catch (error) {
            throw error
        }
    }

    private async _refreshToken() {
        if (!this._accessToken) {
            await this._login()
        }

        if (!this._accessToken) {
            throw new Error(`No access token available, even after login in.`)
        }

        // If the start of the window has passed, refresh the token
        const shouldRefresh = this._accessToken.expired(
            EXPIRATION_WINDOW_IN_SECONDS
        )

        if (shouldRefresh) {
            try {
                this._accessToken = await this._accessToken.refresh()
            } catch (error) {
                this._accessToken = null
                await this._login()
            }
        }
    }

    async login(username: string, password: string) {
        this._username = username
        this._password = password
        await this._login()
    }

    async apiCall<R, T = any>(
        url: string,
        method: Method = 'get',
        data?: T
    ): Promise<R> {
        await this._refreshToken()

        let callUrl = tado_url + url
        if (url.includes('https')) {
            callUrl = url
        }
        const request = {
            url: callUrl,
            method: method,
            data: data,
            headers: {
                Authorization:
                    'Bearer ' + this._accessToken?.token.access_token,
            },
            httpsAgent: this._httpsAgent,
        }
        if (method !== 'get' && method !== 'GET') {
            request.data = data
        }
        const response = await axios(request)

        return response.data as R
    }

    getMe(): Promise<Me> {
        return this.apiCall('/api/v2/me')
    }

    getHome(home_id: number): Promise<Home> {
        return this.apiCall(`/api/v2/homes/${home_id}`)
    }

    getWeather(home_id: number): Promise<Weather> {
        return this.apiCall(`/api/v2/homes/${home_id}/weather`)
    }

    getDevices(home_id: number): Promise<Device[]> {
        return this.apiCall(`/api/v2/homes/${home_id}/devices`)
    }

    getDeviceTemperatureOffset(serial_no: string): Promise<Temperature> {
        return this.apiCall(`/api/v2/devices/${serial_no}/temperatureOffset`)
    }

    // TODO: type
    getInstallations(home_id: number): Promise<any[]> {
        return this.apiCall(`/api/v2/homes/${home_id}/installations`)
    }

    getUsers(home_id: number): Promise<User> {
        return this.apiCall(`/api/v2/homes/${home_id}/users`)
    }

    getState(home_id: number): Promise<State> {
        return this.apiCall(`/api/v2/homes/${home_id}/state`)
    }

    getZoneStates(home_id: number): Promise<ZoneStates> {
        return this.apiCall(`/api/v2/homes/${home_id}/zoneStates`)
    }

    getHeatingCircuits(home_id: number): Promise<HeatingCircuit> {
        return this.apiCall(`/api/v2/homes/${home_id}/heatingCircuits`)
    }

    getMobileDevices(home_id: number): Promise<MobileDevice[]> {
        return this.apiCall(`/api/v2/homes/${home_id}/mobileDevices`)
    }

    getMobileDevice(
        home_id: number,
        mobile_device_id: number
    ): Promise<MobileDevice> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/mobileDevices/${mobile_device_id}`
        )
    }

    getMobileDeviceSettings(
        home_id: number,
        mobile_device_id: number
    ): Promise<MobileDeviceSettings> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/mobileDevices/${mobile_device_id}/settings`
        )
    }

    setGeoTracking(
        home_id: number,
        mobile_device_id: number,
        geoTrackingEnabled: boolean
    ): Promise<MobileDeviceSettings> {
        return this.getMobileDeviceSettings(home_id, mobile_device_id).then(
            (settings) =>
                this.apiCall(
                    `/api/v2/homes/${home_id}/mobileDevices/${mobile_device_id}/settings`,
                    'put',
                    {
                        ...settings,
                        geoTrackingEnabled: geoTrackingEnabled,
                    }
                )
        )
    }

    getZones(home_id: number): Promise<Zone[]> {
        return this.apiCall(`/api/v2/homes/${home_id}/zones`)
    }

    getZoneState(home_id: number, zone_id: number): Promise<ZoneState> {
        return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/state`)
    }

    getZoneControl(home_id: number, zone_id: number): Promise<ZoneControl> {
        return this.apiCall(`/api/v2/homes/${home_id}/zones/${zone_id}/control`)
    }

    getZoneCapabilities(
        home_id: number,
        zone_id: number
    ): Promise<ZoneCapabilities> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/capabilities`
        )
    }

    /**
     * @returns an empty object if overlay does not exist
     */
    getZoneOverlay(
        home_id: number,
        zone_id: number
    ): Promise<ZoneOverlay | {}> {
        return this.apiCall<ZoneOverlay>(
            `/api/v2/homes/${home_id}/zones/${zone_id}/overlay`
        ).catch((error) => {
            if (error.response.status === 404) {
                return {}
            }

            throw error
        })
    }

    /**
     * @param reportDate date with YYYY-MM-DD format (ex: `2022-11-12`)
     */
    getZoneDayReport(
        home_id: number,
        zone_id: number,
        reportDate: string
    ): Promise<ZoneDayReport> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/dayReport?date=${reportDate}`
        )
    }

    getTimeTables(home_id: number, zone_id: number): Promise<TimeTables> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/schedule/activeTimetable`
        )
    }

    getAwayConfiguration(
        home_id: number,
        zone_id: number
    ): Promise<AwayConfiguration> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/awayConfiguration`
        )
    }

    getTimeTable(
        home_id: number,
        zone_id: number,
        timetable_id: string
    ): Promise<TimeTable> {
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/schedule/timetables/${timetable_id}/blocks`
        )
    }

    /**
     * @param from Start date in foramt YYYY-MM-DD
     * @param end Start date in foramt YYYY-MM-DD
     * @param aggregate Period to aggregate metrics by
     * @param summary_only Only report back a summary
     */
    getRunningTimes(
        home_id: number,
        from: string,
        to: string,
        aggregate: RunningTimeAggregation,
        summary_only: true,
    ): Promise<RunningTimesSummaryOnly>
    getRunningTimes(
        home_id: number,
        from: string,
        to: string,
        aggregate: RunningTimeAggregation,
        summary_only: false,
    ): Promise<RunningTimes>
    getRunningTimes(
        home_id: number,
        from: string,
        to: string,
        aggregate: RunningTimeAggregation,
        summary_only: boolean,
    ): Promise<RunningTimes | RunningTimesSummaryOnly>
    {
        return this.apiCall(`https://minder.tado.com/v1/homes/${home_id}/runningTimes?from=${from}&to=${to}&aggregate=${aggregate}&summary_only=${summary_only}`)
    }

    clearZoneOverlay(home_id: number, zone_id: number): Promise<void> {
        console.warn(
            'This method of clearing zone overlays will soon be deprecated, please use clearZoneOverlays'
        )
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/overlay`,
            'delete'
        )
    }

    /**
     * @param temperature in celcius
     * @param termination if number then duration in seconds
     */
    async setZoneOverlay(
        home_id: number,
        zone_id: number,
        power: Power,
        temperature: number,
        termination?: Termination | undefined | number,
        fan_speed?: FanSpeed,
        ac_mode?: ACMode
    ): Promise<ZoneOverlay> {
        console.warn(
            'This method of setting zone overlays will soon be deprecated, please use setZoneOverlays'
        )
        const zone_state = await this.getZoneState(home_id, zone_id)

        const config: {
            setting: DeepPartial<TimeTableSettings> & {
                mode?: any
                fanLevel?: any
            }
            termination: any
            type?: any
        } = {
            setting: zone_state.setting,
            termination: {},
        }

        if (power.toUpperCase() == 'ON') {
            config.setting.power = 'ON'

            if ((config.setting.type == 'HEATING' || config.setting.type == 'HOT_WATER') && temperature) {
                config.setting.temperature = { celsius: temperature }
            }

            if (config.setting.type == 'AIR_CONDITIONING') {
                if (ac_mode) {
                    config.setting.mode = ac_mode.toUpperCase()
                }

                if (
                    config.setting.mode.toLowerCase() == 'heat' ||
                    config.setting.mode.toLowerCase() == 'cool'
                ) {
                    if (temperature) {
                        config.setting.temperature = { celsius: temperature }
                    }

                    if (fan_speed) {
                        config.setting.fanLevel = fan_speed.toUpperCase()
                    }
                }
            }
        } else {
            config.setting.power = 'OFF'
        }

        if (!termination) {
            termination = "MANUAL"
        }

        if (typeof termination === 'string' && !isNaN(parseInt(termination))) {
            termination = parseInt(termination)
        }

        if (typeof termination === 'number') {
            config.type = 'MANUAL'
            config.termination.typeSkillBasedApp = 'TIMER'
            config.termination.durationInSeconds = termination
        } else if (termination.toLowerCase() == 'manual') {
            config.type = 'MANUAL'
            config.termination.typeSkillBasedApp = 'MANUAL'
        } else if (termination.toLowerCase() == 'auto') {
            // Not sure how to test this is the web app
            // But seems to by a combo of 'next_time_block' and geo
            config.termination.type = 'TADO_MODE'
        } else if (termination.toLowerCase() == 'next_time_block') {
            config.type = 'MANUAL'
            config.termination.typeSkillBasedApp = 'NEXT_TIME_BLOCK'
        }

        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/overlay`,
            'put',
            config
        )
    }

    async clearZoneOverlays(
        home_id: number,
        zone_ids: number[]
    ): Promise<void> {
        const rooms = zone_ids.join(',')
        return this.apiCall(
            `/api/v2/homes/${home_id}/overlay?rooms=${rooms}`,
            'delete'
        )
    }

    /**
     * @param termination if number then duration in seconds
     */
    async setZoneOverlays(
        home_id: number,
        overlays: {
            zone_id: number
            power?: Power
            mode?: any
            temperature?: Temperature
            fanLevel?: any
            fanSpeed?: any
            verticalSwing?: any
            horizontalSwing?: any
            light?: any
        }[],
        termination: Termination | undefined | number
    ): Promise<void> {
        let termination_config: {
            typeSkillBasedApp?: any
            durationInSeconds?: number
        } = {}

        if (!termination) {
            termination = "MANUAL"
        }

        if (typeof termination === 'string' && !isNaN(parseInt(termination))) {
            termination = parseInt(termination)
        }

        if (typeof termination === 'number') {
            termination_config.typeSkillBasedApp = 'TIMER'
            termination_config.durationInSeconds = termination
        } else if (termination.toLowerCase() == 'manual') {
            termination_config.typeSkillBasedApp = 'MANUAL'
        } else if (termination.toLowerCase() == 'auto') {
            termination_config.typeSkillBasedApp = 'TADO_MODE'
        } else if (termination.toLowerCase() == 'next_time_block') {
            termination_config.typeSkillBasedApp = 'NEXT_TIME_BLOCK'
        }

        let config: any = {
            overlays: [],
        }

        for (let overlay of overlays) {
            const zone_state = await this.getZoneState(home_id, overlay.zone_id)

            const overlay_config: any = {
                overlay: {
                    setting: zone_state.setting,
                    termination: termination_config,
                },
                room: overlay.zone_id,
            };

            [
                'power',
                'mode',
                'temperature',
                'fanLevel',
                'fanSpeed',
                'verticalSwing',
                'horizontalSwing',
                'light',
            ].forEach((prop) => {
                if (overlay.hasOwnProperty(prop) || overlay.power === 'ON') {
                    if (
                        typeof (overlay as any)[prop] === 'string' ||
                        (overlay as any)[prop] instanceof String
                    ) {
                        overlay_config.overlay.setting[prop] = (overlay as any)[
                            prop
                        ].toUpperCase()
                    } else {
                        overlay_config.overlay.setting[prop] = (overlay as any)[
                            prop
                        ]
                    }
                }
            })

            config.overlays.push(overlay_config)
        }

        return this.apiCall(`/api/v2/homes/${home_id}/overlay`, 'post', config)
    }

    /**
     * @param temperatureOffset in celcius
     */
    setDeviceTemperatureOffset(
        serial_no: number,
        temperatureOffset: number
    ): Promise<Temperature> {
        const config = {
            celsius: temperatureOffset,
        }

        return this.apiCall(
            `/api/v2/devices/${serial_no}/temperatureOffset`,
            'put',
            config
        )
    }

    identifyDevice(serial_no: string): Promise<void> {
        return this.apiCall(`/api/v2/devices/${serial_no}/identify`, 'post')
    }

    setPresence(home_id: number, presence: StatePresence): Promise<void> {
        const upperCasePresence = presence.toUpperCase()

        if (!['HOME', 'AWAY', 'AUTO'].includes(upperCasePresence)) {
            throw new Error(
                `Invalid presence "${upperCasePresence}" must be "HOME", "AWAY", or "AUTO"`
            )
        }

        const method = upperCasePresence == 'AUTO' ? 'delete' : 'put'
        const config = {
            homePresence: upperCasePresence,
        }

        return this.apiCall(
            `/api/v2/homes/${home_id}/presenceLock`,
            method,
            config
        )
    }

    async isAnyoneAtHome(home_id: number): Promise<boolean> {
        const devices = await this.getMobileDevices(home_id)

        for (const device of devices) {
            if (
                device.settings.geoTrackingEnabled &&
                device.location &&
                device.location.atHome
            ) {
                return true
            }
        }

        return false
    }

    async updatePresence(
        home_id: number
    ): Promise<void | 'already up to date'> {
        const [isAnyoneAtHome, presenceState] = await Promise.all([
            this.isAnyoneAtHome(home_id),
            this.getState(home_id),
        ])
        const isPresenceAtHome = presenceState.presence === 'HOME'

        if (isAnyoneAtHome !== isPresenceAtHome) {
            return this.setPresence(home_id, isAnyoneAtHome ? 'HOME' : 'AWAY')
        } else {
            return 'already up to date'
        }
    }

    setWindowDetection(
        home_id: number,
        zone_id: number,
        enabled: true,
        timeout: number
    ): Promise<void>
    setWindowDetection(
        home_id: number,
        zone_id: number,
        enabled: false
    ): Promise<void>
    setWindowDetection(
        home_id: number,
        zone_id: number,
        enabled: boolean,
        timeout?: number
    ): Promise<void> {
        const config = {
            enabled: enabled,
            timeoutInSeconds: timeout,
        }
        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/openWindowDetection`,
            'PUT',
            config
        )
    }

    setOpenWindowMode(
        home_id: number,
        zone_id: number,
        activate: boolean
    ): Promise<void> {
        if (activate) {
            return this.apiCall(
                `/api/v2/homes/${home_id}/zones/${zone_id}/state/openWindow/activate`,
                'POST'
            )
        }

        return this.apiCall(
            `/api/v2/homes/${home_id}/zones/${zone_id}/state/openWindow`,
            'DELETE'
        )
    }

    setChildlock(serial_no: string, child_lock: boolean): Promise<void> {
        return this.apiCall(`/api/v2/devices/${serial_no}/childLock`, 'PUT', { childLockEnabled: child_lock })
    }

    getAirComfort(home_id: number): Promise<AirComfort> {
        return this.apiCall(`/api/v2/homes/${home_id}/airComfort`)
    }

    async getAirComfortDetailed(home_id: number): Promise<AirComfortDetailed> {
        const home = await this.getHome(home_id)
        const location = `latitude=${home.geolocation.latitude}&longitude=${home.geolocation.longitude}`
        const login = `username=${this._username}&password=${this._password}`
        const resp = await axios(
            `https://acme.tado.com/v1/homes/${home_id}/airComfort?${location}&${login}`
        )
        return resp.data
    }

    async getEnergyIQ(home_id: number): Promise<EnergyIQ> {
        const home = await this.getHome(home_id);
        const country = home.address.country;
        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/consumption?country=${country}`
        )
    }

    // FIXME: not working?
    getEnergyIQTariff(home_id: number) {
        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/tariff`
        )
    }

    // FIXME: not working?
    updateEnergyIQTariff(home_id: number, unit: IQUnit, tariffInCents: number) {
        if (!['m3', 'kWh'].includes(unit)) {
            throw new Error(`Invalid unit "${unit}" must be "m3", or "kWh"`)
        }

        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/tariff`,
            'put',
            { unit: unit, tariffInCents: tariffInCents }
        )
    }

    getEnergyIQMeterReadings(home_id: number): Promise<EnergyIQMeterReadings> {
        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/meterReadings`
        )
    }

    /**
     * @param date format `YYYY-MM-DD`
     */
    addEnergyIQMeterReading(
        home_id: number,
        date: string,
        reading: number
    ): Promise<AddEnergiIQMeterReadingResponse> {
        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/meterReadings`,
            'post',
            { date: date, reading: reading }
        )
    }

    deleteEnergyIQMeterReading(
        home_id: number,
        reading_id: number
    ): Promise<void> {
        return this.apiCall(
            `https://energy-insights.tado.com/api/homes/${home_id}/meterReadings/${reading_id}`,
            'delete',
            {}
        )
    }

    getEnergySavingsReport(
        home_id: number,
        year: string,
        month: string,
        countryCode: Country
    ): Promise<EnergySavingReport> {
        return this.apiCall(
            `https://energy-bob.tado.com/${home_id}/${year}-${month}?country=${countryCode}`
        )
    }
}
