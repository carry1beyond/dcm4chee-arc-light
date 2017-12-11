import {Component, HostListener, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {Globalvar} from "../../constants/globalvar";
import {StatisticsService} from "../statistics/statistics.service";
import {colorSets} from "@swimlane/ngx-charts/release/utils";
import {DashboardService} from "./dashboard.service";
import {j4care} from "../../helpers/j4care.service";
import * as _ from 'lodash';
import {AppService} from "../../app.service";

@Component({
    selector: 'dashboard',
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit,OnDestroy {

/*    public barChartLabels = [];
    public pieChartColor =  Globalvar.HISTOGRAMCOLORS;
    public barChartType:string = 'line';
    public barChartLegend:boolean = true;
    public barChartData:any[] = [];*/
    //
    Object = Object;
    searchlist = '';
    counts = {
        querie:'-',
        retrieve:'-',
        errors:'-',
        wildflError:'-',
        studieStored:'-'
    };
    colorScheme;
    showXAxis = true;
    showYAxis = true;
    gradient = true;
    showLegend = true;
    showXAxisLabel = true;
    showYAxisLabel = true;
    xAxisLabel = {
        cpu:'@timestamp per 30 seconds',
        memoryRss:'@timestamp per 30 seconds',
        memoryUsage:'@timestamp per 30 seconds',
        transmittedPackets:'@timestamp per 30 seconds',
        writesPerSecond:'@timestamp per 30 seconds',
        readsPerSecond:'@timestamp per 30 seconds'
    };
    yAxisLabel = {
        cpu:'Max CPU total usage',
        memoryRss:'RSS memory consumption (B)',
        memoryUsage:'Memory consumption (B)',
        transmittedPackets:'Packets transmitted per second',
        writesPerSecond:'Average written B/s',
        readsPerSecond:'Average read B/s'
    };
    autoScale = true;
    view: any[] = [800, 250];
    onSelect(event) {
        console.log(event);
/*        this.colorScheme = colorSets[0];
        if(colorSets.length > this.colorIndex + 1){
            this.colorIndex++;
            this.colorScheme = colorSets[this.colorIndex];
        }else{
            this.colorIndex = 0;
            this.colorScheme = colorSets[this.colorIndex];

        }
        console.log("this.colorSchema",this.colorScheme);*/
    }

    elasticSearchIsRunning;
    url;
    // graphData = {"labels":[1510754400000],"data":{"1.2.840.10008.5.1.4.1.1.1":{"data":[3]},"1.2.840.10008.5.1.4.1.1.2":{"data":[1]}},"ready":{"labels":["2017-11-13T14:24:25.694Z","2017-11-15T14:00:00.000Z","2017-11-20T14:24:25.695Z"],"data":[{"label":"1.2.840.10008.5.1.4.1.1.1","data":[null,3,null]},{"label":"1.2.840.10008.5.1.4.1.1.2","data":[null,1,null]}]},"chartOptions":{"scaleShowVerticalLines":false,"responsive":true,"maintainAspectRatio":false,"legend":{"position":"top"},"scales":{"xAxes":[{"type":"time","time":{"displayFormats":{"millisecond":"DD.MM.YYYY","second":"DD.MM.YYYY","minute":"DD.MM.YYYY","hour":"DD.MM.YYYY","day":"DD.MM.YYYY","week":"DD.MM.YYYY","month":"DD.MM.YYYY","quarter":"DD.MM.YYYY","year":"DD.MM.YYYY"}}}],"yAxes":[{"ticks":{"min":0},"scaleLabel":{"display":true,"labelString":"Studies"}}]}},"show":false};
    graphData = {};
    rangeMin = {
        from:undefined,
        to:undefined
    };
    rangeDay = {
        from:undefined,
        to:undefined
    };
    aets;
    colorIndex = 0;
    auditEvents;
    moreAudit = {
        limit: 30,
        start: 0,
        loaderActive: false
    };
    updateInterval = {
        'cpu':undefined,
        'memoryRss':undefined,
        'memoryUsage':undefined,
        'transmittedPackets':undefined,
        'writesPerSecond':undefined,
        'readsPerSecond':undefined
    };
    firstIntervalInit = {
        'cpu':false,
        'memoryRss':false,
        'memoryUsage':false,
        'transmittedPackets':false,
        'writesPerSecond':false,
        'readsPerSecond':false
    };
    updateIntervalTime= 30000;
    constructor(
        public statisticsService:StatisticsService,
        public service:DashboardService,
        public mainservice:AppService
    ) { }
    public barChartOptions:any = {
        scaleShowVerticalLines: false,
        responsive: true,
        maintainAspectRatio: false,
        legend:{
            position:'right'
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    displayFormats: {
                        'millisecond': 'DD.MM.YYYY',
                        'second': 'DD.MM.YYYY',
                        'minute': 'DD.MM.YYYY',
                        'hour': 'DD.MM.YYYY',
                        'day': 'DD.MM.YYYY',
                        'week': 'DD.MM.YYYY',
                        'month': 'DD.MM.YYYY',
                        'quarter': 'DD.MM.YYYY',
                        'year': 'DD.MM.YYYY',
                    }
                }
            }],
            yAxes: [{
                ticks: {
                    min: 0
                },
                scaleLabel: {
                    display: true,
                    labelString: 'Queries'
                }
            }]
        }
    };
    ngOnInit(){
        this.initCheck(10);
    }
    initCheck(retries){
        let $this = this;
        if(_.hasIn(this.mainservice,"global.authentication")){
            this.init();
        }else{
            if (retries){
                setTimeout(()=>{
                    $this.initCheck(retries-1);
                },20);
            }else{
                this.init();
            }
        }
    }
    init() {
        console.log("colorSets",colorSets);
        this.colorScheme = colorSets[2];
        this.setTodayDate();
        this.setMin();
        this.getElasticsearchUrl(2);

    }
    showErrors(){
        if(this.counts.errors && this.counts.errors != '-' && this.counts.errors != '0'){
            console.log("$('#auditevents').offset().top",$('#auditevents').offset().top);
            $('html, body').animate({
                scrollTop: $("#auditevents").offset().top
            }, 500);
            this.searchlist = 'failure';
        }
    }
    @HostListener('window:scroll', ['$event'])
    loadMoreAuditOnScroll(event) {
        let hT = ($('.load_more').offset()) ? $('.load_more').offset().top : 0,
            hH = $('.load_more').outerHeight(),
            wH = $(window).height(),
            wS = window.pageYOffset;
        console.log("ws",wS);
        console.log("hT + hH - wH",(hT + hH - wH));
        if (wS > (hT + hH - wH)){
            this.loadMoreAudit();
        }
    }
    loadMoreAudit(){
        this.moreAudit.loaderActive = true;
        this.moreAudit.limit += 20;
        this.moreAudit.loaderActive = false;
    }
    setTodayDate(){
        let d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        this.rangeDay.from = d;
        this.rangeDay.to = new Date();
    }
    setMin(){
        let d = new Date();
        d.setMinutes(d.getMinutes() - 15);
        this.rangeMin.from = d;
        this.rangeMin.to = new Date();
    }
    detailView(object){
        console.log("wholeobject",object);
        object.showDetail = !object.showDetail;
    }
    toggleTimer(mode){
        if(!this.updateInterval[mode]){
            this.startInterval[mode]();
        }else{
            clearInterval(this.updateInterval[mode]);
            this.updateInterval[mode] = undefined;
        }
    }
    startInterval = {
        cpu:()=>{
            // this.getCpuUsage();
            if(!this.updateInterval['cpu']){
                this.updateInterval['cpu'] = setInterval(()=>{
                    this.getCpuUsage();
                },this.updateIntervalTime);
            }
        },
        memoryRss:()=>{
            // this.getMemoryRssUsage();
            if(!this.updateInterval['memoryRss']){
                this.updateInterval['memoryRss'] = setInterval(()=>{
                    this.getMemoryRssUsage();
                },this.updateIntervalTime);
            }
        },
        memoryUsage:()=>{
            // this.getMemoryUsage();
            if(!this.updateInterval['memoryUsage']){
                this.updateInterval['memoryUsage'] = setInterval(()=>{
                    this.getMemoryUsage();
                },this.updateIntervalTime);
            }
        },
        transmittedPackets:()=>{
            // this.getNetworkTransmittedPackets();
            if(!this.updateInterval['transmittedPackets']){
                this.updateInterval['transmittedPackets'] = setInterval(()=>{
                    this.getNetworkTransmittedPackets();
                },this.updateIntervalTime);
            }
        },
        writesPerSecond:()=>{
            // this.getWritesPerSecond();
            if(!this.updateInterval['writesPerSecond']){
                this.updateInterval['writesPerSecond'] = setInterval(()=>{
                    this.getWritesPerSecond();
                },this.updateIntervalTime);
            }
        },
        readsPerSecond:()=>{
            // this.getReadsPerSecond();
            if(!this.updateInterval['readsPerSecond']){
                this.updateInterval['readsPerSecond'] = setInterval(()=>{
                    this.getReadsPerSecond();
                },this.updateIntervalTime);
            }
        }
    };
    startAllGraphIntervals(){
       for(let interval in this.startInterval){
           this.startInterval[interval]();
       }
    }
    stopAllGraphIntervals(){
       for(let interval in this.startInterval){
           clearInterval(this.updateInterval[interval]);
       }
    }
    getElasticsearchUrl(retries){
        let $this = this;
        this.statisticsService.getElasticsearchUrl().subscribe(
            (res)=>{
                $this.url = res.url;
                $this.checkIfElasticSearchIsRunning(2);
            },
            (err)=>{
                if (retries){
                    $this.getElasticsearchUrl(retries-1);
                }else{
                    $this.elasticSearchIsRunning = false;
                }
            }
        );
    }

    checkIfElasticSearchIsRunning(retries){
        let $this = this;
        this.statisticsService.checkIfElasticSearchIsRunning(this.url).subscribe(
            (res)=>{
                $this.elasticSearchIsRunning = true;
                // $this.updateInterval = setInterval(()=>{
                //     $this.setMin();
                //     $this.getGraphDataFromElasticsearch();
                // },$this.updateIntervalTime);
                $this.getGraphDataFromElasticsearch();
                // $this.startAllGraphIntervals();
                $this.getCountDataFromElasticsearch();
                $this.getAets(2);
            },
            (err)=>{
                if (retries){
                    $this.checkIfElasticSearchIsRunning(retries-1);
                }else{
                    $this.elasticSearchIsRunning = false;
                }
            }
        );
    }
    getData(){
        this.getStudiesStoredCountsFromDatabase();
        this.getGraphDataFromElasticsearch();
        this.getCountDataFromElasticsearch();
    }
    getCountDataFromElasticsearch(){
        this.getQueriesCount();
        this.getRetrieveCounts();
        this.getErrorCounts();
        this.getWildflyErrorCounts();
        this.getAuditEvents();

    }
    getGraphDataFromElasticsearch(){
        this.getCpuUsage();
        this.getMemoryRssUsage();
        this.getMemoryUsage();
        this.getNetworkTransmittedPackets();
        this.getReadsPerSecond();
        this.getWritesPerSecond();

    }
    getCpuUsage(){
        this.statisticsService.getCpuUsage(this.rangeMin, this.url).subscribe(cpu=>{
            if(this.graphData['cpu']){
                this.graphData['cpu'] = [];
                this.graphData['cpu'] = [...this.service.prepareGraphData(cpu)];
            }else{
                this.graphData['cpu'] = this.service.prepareGraphData(cpu);
            }
            this.startInterval["cpu"]();
            this.firstIntervalInit["cpu"] = true;
        });
    }
    getMemoryRssUsage(){
        this.statisticsService.getMemoryRssUsage(this.rangeMin, this.url).subscribe(memoryRss=>{
            if(this.graphData['memoryRss']){
                this.graphData['memoryRss'] = [];
                this.graphData['memoryRss'] = [...this.service.prepareGraphData(memoryRss)];
            }else{
                this.graphData['memoryRss'] = this.service.prepareGraphData(memoryRss);
            }
            this.startInterval["memoryRss"]();
            this.firstIntervalInit["memoryRss"] = true;
        });
    }
    getMemoryUsage(){
        this.statisticsService.getMemoryUsage(this.rangeMin, this.url).subscribe(memoryUsage=>{
            if(this.graphData['memoryUsage']){
                this.graphData['memoryUsage'] = [];
                this.graphData['memoryUsage'] = [...this.service.prepareGraphData(memoryUsage)];
            }else{
                this.graphData['memoryUsage'] = this.service.prepareGraphData(memoryUsage);
            }
            this.startInterval["memoryUsage"]();
            this.firstIntervalInit["memoryUsage"] = true;
        });
    }
    getNetworkTransmittedPackets(){
        this.statisticsService.getNetworkTransmittedPackets(this.rangeMin, this.url).subscribe(transmittedPackets=>{
            if(this.graphData['transmittedPackets']){
                this.graphData['transmittedPackets'] = [];
                this.graphData['transmittedPackets'] = [...this.service.prepareGraphData(transmittedPackets)];
            }else{
                this.graphData['transmittedPackets'] = this.service.prepareGraphData(transmittedPackets);
            }
            this.startInterval["transmittedPackets"]();
            this.firstIntervalInit["transmittedPackets"] = true;
        });
    }
    getWritesPerSecond(){
        this.statisticsService.getWritesPerSecond(this.rangeMin, this.url).subscribe(writesPerSecond=>{
            if(this.graphData['writesPerSecond']){
                this.graphData['writesPerSecond'] = [];
                this.graphData['writesPerSecond'] = [...this.service.prepareGraphData(writesPerSecond)];
            }else{
                this.graphData['writesPerSecond'] = this.service.prepareGraphData(writesPerSecond);
            }
            this.startInterval["writesPerSecond"]();
            this.firstIntervalInit["writesPerSecond"] = true;
        });
    }
    getReadsPerSecond(){
        this.statisticsService.getReadsPerSecond(this.rangeMin, this.url).subscribe(readsPerSecond=>{
            if(this.graphData['readsPerSecond']){
                this.graphData['readsPerSecond'] = [];
                this.graphData['readsPerSecond'] = [...this.service.prepareGraphData(readsPerSecond)];
            }else{
                this.graphData['readsPerSecond'] = this.service.prepareGraphData(readsPerSecond);
            }
            this.startInterval["readsPerSecond"]();
            this.firstIntervalInit["readsPerSecond"] = true;
        });
    }
    getQueriesCount(){
        let $this = this;
        this.statisticsService.getQueriesCounts(this.rangeDay, this.url).subscribe(
            (res)=>{
                try {
                    $this.counts.querie= res.hits.total;
                }catch (e){
                    $this.counts.querie = "-";
                }
            },
            (err)=>{
                $this.counts.querie = "-";
            });

    }
    getRetrieveCounts(){
        let $this = this;
        this.statisticsService.getRetrieveCounts(this.rangeDay, this.url).subscribe(
            (res)=>{
                try {
                    $this.counts.retrieve= res.hits.total;
                }catch (e){
                    $this.counts.retrieve = "-";
                }
            },
            (err)=>{
                $this.counts.retrieve = "-";
            });

    }
    getStudiesStoredCountsFromDatabase(){
        let $this = this;
        this.statisticsService.getStudiesStoredCountsFromDatabase(this.rangeDay, this.aets).subscribe(
            (res)=>{
                try {
                    $this.counts.studieStored = res.map(count => {return count.count}).reduce((a, b) => a + b, 0);
                }catch (e){
                    $this.counts.studieStored = "-";
                }
            },
            (err)=>{
                $this.counts.studieStored = "-";
                console.log("error",err);
            });
    }
    getErrorCounts(){
        let $this = this;
        this.statisticsService.getErrorCounts(this.rangeDay, this.url).subscribe(
            (res)=>{
                try {
                    $this.counts.errors = res.hits.total;
                }catch (e){
                    $this.counts.errors = "-";
                }
            },
            (err)=>{
                console.log("error",err);
                $this.counts.errors = "-";
            });
    }
    getWildflyErrorCounts(){
        let $this = this;
        this.statisticsService.getWildflyErrorCounts(this.rangeDay, this.url).subscribe(
            (res)=>{
                try {
                    $this.counts.wildflError = res.hits.total;
                }catch (e){
                    $this.counts.wildflError = "-";
                }
            },
            (err)=>{
                $this.counts.wildflError = "-";
                console.log("error",err);
            });
    }
    getAuditEvents(){
        let $this = this;
        this.statisticsService.getAuditEvents(this.rangeDay, this.url).subscribe((res)=>{
            $this.auditEvents = res.hits.hits.map((audit)=>{
                return {
                    AuditSourceID:(_.hasIn(audit,"_source.AuditSource.AuditSourceID"))?audit._source.AuditSource.AuditSourceID:'-',
                    EventID:(_.hasIn(audit,"_source.EventID.originalText"))?audit._source.EventID.originalText:'-',
                    ActionCode:(_.hasIn(audit,"_source.Event.EventActionCode"))?this.statisticsService.getActionCodeText(audit._source.Event.EventActionCode):'-',
                    Patient:(_.hasIn(audit,"_source.Patient.ParticipantObjectName"))?audit._source.Patient.ParticipantObjectName:'-',
                    Study:(_.hasIn(audit,"_source.Study.ParticipantObjectID"))?audit._source.Study.ParticipantObjectID:'-',
                    AccessionNumber:(_.hasIn(audit,"_source.AccessionNumber"))?audit._source.AccessionNumber:'-',
                    userId:(_.hasIn(audit,"_source.Source.UserID"))?audit._source.Source.UserID:'-',
                    requestorId:(_.hasIn(audit,"_source.Requestor.UserID"))?audit._source.Requestor.UserID:'-',
                    EventOutcomeIndicator:(_.hasIn(audit,"_source.Event.EventOutcomeIndicator"))? this.statisticsService.getEventOutcomeIndicatorText(audit._source.Event.EventOutcomeIndicator):{text:'-'},
                    Time:(_.hasIn(audit,"_source.Event.EventDateTime"))?audit._source.Event.EventDateTime:undefined,
                    wholeObject:j4care.flatten(audit._source),
                    showDetail:false
                }
            });
        });
    }
    getAets(retries){
        let $this = this;
        $this.statisticsService.getAets().subscribe((res)=>{
            $this.aets = res;
            $this.getStudiesStoredCountsFromDatabase();
        },(err)=>{
            if(retries)
                $this.getAets(retries-1);
        });
    }

    ngOnDestroy(){
        // clearInterval(this.updateInterval);
        this.stopAllGraphIntervals();
    }
}