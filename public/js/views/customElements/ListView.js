'use strict';

var ASC = '1';
var DESC = '-1';

define([
    'text!templates/customElements/paginationTemplate.html',
    'text!templates/customElements/mainTemplate.html'
], function (PaginationTemplate, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        listLength        : null,
        defaultItemsNumber: null,
        newCollection     : null,
        $pagination       : null,

        paginationTemplate: _.template(PaginationTemplate),
        mainTemplate      : _.template(MainTemplate),
        listTemplate      : null,
        Collection        : null,
        url               : null,
        navElement        : '#nav_dashborad',
        defaults          : {
            page  : 1,
            count : 5,
            order : '1',
            search: '',
            status: '' //TODO: ???
        },

        removeParams: {
            url           : null,
            confirmMessage: 'Are You sure want to delete?'
        },

        events: {
            'click .item'             : 'showItem',
            'click .showPage'         : 'gotoPage',
            'click .showFirst'        : 'firstPage',
            'click .showLast'         : 'lastPage',
            'click .sortable'         : 'sort',
            'click .searchBtn'        : 'search',
            'click .checkAll'         : 'checkAll',
            'click #removeSelectedBtn': 'removeSelectedItems',
            'click .deleteCurrentBtn' : 'deleteCurrentItem'
        },

        initialize: function (options) {
            var opts = options || {};
            var Collection = this.Collection;
            var defaults = this.defaults;
            var self = this;
            var collectionParams = {};
            var fetchParams;
            var params;

            params = {
                page  : opts.page || defaults.page,
                count : opts.countPerPage || defaults.count,
                search: opts.search || defaults.search,
                status: opts.status || defaults.status
            };

            if (opts.orderBy) {
                params.orderBy = opts.orderBy;
                params.order = opts.order || defaults.order;
            }

            if (opts.id) {
                collectionParams.id = opts.id;
            }

            fetchParams = _.extend(collectionParams, params);

            this.pageParams = params;
            this.render();
            this.collection = new Collection(fetchParams);
            this.collection.on('reset remove', function () {
                self.renderList();
            });

            if (opts.search) {
                this.$el.find('.search').val(opts.search);
            }
        },

        render: function () {
            var navContainer = $('.sidebar-menu');
            var navElement = this.navElement;

            this.$el.html(this.mainTemplate(this.pageParams));

            navContainer.find('.active').removeClass('active');
            navContainer.find(navElement).addClass('active');

            return this;
        },

        renderList: function () {
            var items = this.collection.toJSON();
            var params = this.pageParams;
            var orderBy = params.orderBy;
            var order = params.order;
            var orderClassName;

            this.$el.find('.items').html(this.listTemplate({items: items}));
            this.$el.find('.pagination').html(this.paginationTemplate());
            this.pageElementRender();

            if (orderBy) {
                order = order || ASC;

                if (order === ASC) {
                    orderClassName = 'asc';
                } else {
                    orderClassName = 'desc';
                }

                this.$el.find('.sortable[data-orderBy="' + orderBy + '"]')
                    .addClass(orderClassName);
            }

            return this;
        },

        changeLocationHash: function () {
            var url = this.url;
            var params = this.pageParams;
            var page = params.page;
            var count = params.count;
            var orderBy = params.orderBy;
            var order = params.order || this.defaults.order;
            var search = params.search;

            url += '/p=' + page;
            url += '/c=' + count;

            if (orderBy) {
                url += '/orderBy=' + orderBy + '/order=' + order;
            }

            if (search) {
                url += '/search=' + search;
            }

            Backbone.history.navigate(url);
        },

        firstPage: function (options) {
            var page = 1;
            var params = this.pageParams;
            var collectionParams;

            params.page = page;
            collectionParams = _.extend({reset: true}, params);

            this.collection.getPage(page, collectionParams);
            this.changeLocationHash();
        },

        lastPage: function (options) {
            var page = this.totalPages;
            var params = this.pageParams;
            var collectionParams;

            params.page = page;
            collectionParams = _.extend({reset: true}, params);

            this.collection.getPage(page, collectionParams);
            this.changeLocationHash();
        },

        getPage: function (options) {
            var itemsNumber;
            var page;
            var adr = /^\d+$/;
            var lastPage;
            var itemsNumber;
            var itemsOnPage = 7;

            if (!this.listLength) {
                return $("#currentShowPage").val(0);
            }

            page = parseInt(event.target.textContent);

            if (!page) {
                page = $(event.target).val();
            }

            lastPage = parseInt($('#lastPage').text());
            itemsNumber = $("#itemsNumber").text();

            if (!adr.test(page) || (parseInt(page) <= 0) || (parseInt(page) > parseInt(lastPage))) {
                page = 1;
            }

            $("#pageList").empty();

            if (parseInt(lastPage) <= itemsOnPage) {
                for (var i = 1; i <= parseInt(lastPage); i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (page >= 5 && page <= itemsOnPage) {
                for (var i = parseInt(page) - 3; i <= parseInt(page) + 3; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (lastPage >= itemsOnPage && page <= itemsOnPage) {
                for (var i = 1; i <= itemsOnPage; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (lastPage >= itemsOnPage && page > 3 && page <= parseInt(lastPage) - 3) {
                for (var i = parseInt(page) - 3; i <= parseInt(page) + 3; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (page >= parseInt(lastPage) - 3) {
                for (var i = lastPage - 6; i <= parseInt(lastPage); i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            }

            $("#currentShowPage").val(page);
            $("#gridStart").text((page - 1) * itemsNumber + 1);

            if (this.listLength <= page * itemsNumber) {
                $("#gridEnd").text(this.listLength);
            } else {
                $("#gridEnd").text(page * itemsNumber);
            }
            if (page <= 1) {
                $("#previousPage").prop("disabled", true);
                $("#nextPage").prop("disabled", false);
                $("#firstShowPage").prop("disabled", true);
                $("#lastShowPage").prop("disabled", false);
            }
            if (page >= lastPage) {
                $("#nextPage").prop("disabled", true);
                $("#previousPage").prop("disabled", false);
                $("#lastShowPage").prop("disabled", true);
                $("#firstShowPage").prop("disabled", false);
            }
            if ((1 < page) && (page < lastPage)) {
                $("#nextPage").prop("disabled", false);
                $("#previousPage").prop("disabled", false);
                $("#lastShowPage").prop("disabled", false);
                $("#firstShowPage").prop("disabled", false);
            }
            if ((page == lastPage) && (lastPage == 1)) {
                $("#previousPage").prop("disabled", true);
                $("#nextPage").prop("disabled", true);
                $("#firstShowPage").prop("disabled", true);
                $("#lastShowPage").prop("disabled", true);
            }

            this.collection.getPage(options);
            this.changeLocationHash(page, itemsNumber);
        },

        getPaginationContent: function (from, to) {
            var currentPage = this.pageParams.page;
            var html = '';

            for (var i = from; i < to; i++) {
                if (i === currentPage) {
                    html += '<li class="showPage active">' + i + '</li>';
                } else {
                    html += '<li class="showPage">' + i + '</li>';
                }
            }

            return html;
        },

        pageElementRender: function () {
            var totalCount = this.collection.totalRecords;
            var params = this.pageParams;
            var count = params.count;
            var currentPage = params.page;
            var totalPages;
            var itemsOnPage = this.collection.length;//7;
            var paginationContent;

            if (totalCount) {

                currentPage = currentPage || 1;
                totalPages = Math.ceil(totalCount / count);
                this.totalPages = totalPages;

                if (totalPages >= 1) {
                    paginationContent = this.getPaginationContent(1, totalPages + 1);
                }

                /*if (totalPages <= itemsOnPage) {
                 paginationContent = this.getPaginationContent(0, totalPages);
                 } else if (totalPages >= itemsOnPage && currentPage <= itemsOnPage) {
                 paginationContent = this.getPaginationContent(0, itemsOnPage);
                 } else if (totalPages >= itemsOnPage && currentPage > 3 && currentPage <= totalPages - 3) {
                 paginationContent = this.getPaginationContent(currentPage - 3, currentPage + 3);
                 } else if (currentPage >= totalPages - 3) {
                 paginationContent = this.getPaginationContent(totalPages - 6, totalPages);
                 }*/

                this.$el.find('#pageList .showFirst').after(paginationContent);

                /*if (totalPages <= 1) {
                 $("#nextPage").prop("disabled", true);
                 $("#lastShowPage").prop("disabled", true);

                 this.$el.find('#pageList .showFirst').after(paginationContent);
                 }*/
            } else {

            }
        },

        gotoPage: function (e) {
            var page = parseInt(e.target.textContent);
            var params = this.pageParams;
            var collectionParams;

            e.preventDefault();

            params.page = page;
            collectionParams = _.extend({reset: true}, params);

            this.collection.getPage(page, collectionParams);
            this.changeLocationHash();
        },

        sort: function (e) {
            var target = $(e.target);
            var orderBy = target.data('orderby');
            var params = this.pageParams;
            var collectionParams;
            var order = params.order || this.defaults.order;

            if (order == '1') {
                target.removeClass('asc');
                target.addClass('desc');
                params.order = '-1';
            } else {
                target.removeClass('desc');
                target.addClass('asc');
                params.order = '1';
            }

            params.orderBy = orderBy;
            collectionParams = _.extend({reset: true}, params);

            this.collection.getPage(params.page, collectionParams);
            this.changeLocationHash();
        },

        search: function (e) {
            var searchValue = this.$el.find('.search').val() || '';
            var params = this.pageParams;
            var collectionParams;
            var page = 1;

            params.page = page;
            params.search = searchValue;
            collectionParams = _.extend({reset: true}, params);

            this.collection.getPage(page, collectionParams);
            this.changeLocationHash();
        },

        checkAll: function (e) {
            var state = $(e.target).prop('checked');
            var checkboxes = this.$el.find('tbody .checkItem');

            e.stopPropagation();

            checkboxes.prop('checked', state);
        },

        getSelectedIds: function () {
            var checkboxes = this.$el.find('.checkItem:checked');
            var ids = _.map(checkboxes, function (checkbox) {
                return $(checkbox).closest('tr').data('id');
            });

            return ids;
        },

        removeConfirm: function (options) {
            var opts = options || {};
            var onConfirm = opts.onConfirm;
            var onCancel = opts.onCancel || function () {
                    $("#dialog").dialog('close');
                };
            var buttons = {
                "Delete": onConfirm,
                "Cancel": onCancel
            };
            var dialogOptions = {
                resizable: false,
                modal    : true,
                buttons  : buttons
            };
            var dialogContainer = $('#dialog');
            var message = this.removeParams.confirmMessage;

            dialogContainer.find('.message').html(message);
            dialogContainer.dialog(dialogOptions);
        },

        removeSelectedItems: function (e) {
            var self = this;

            this.removeConfirm({
                onConfirm: function () {
                    var ids = self.getSelectedIds();

                    $("#dialog").dialog('close');
                    self.remove(ids);
                }
            });
        },

        deleteCurrentItem: function (e) {
            var self = this;

            this.removeConfirm({
                onConfirm: function () {
                    var target = $(e.target);
                    var itemId = target.closest('tr').data('id');
                    var ids = [itemId];

                    $("#dialog").dialog('close');
                    self.remove(ids);
                }
            });
        },

        remove: function (ids) {
            var data = {
                packagesArray: ids
            };
            var dataStr = JSON.stringify(data);
            var url = this.removeParams.url;
            var self = this;

            if (!url) {
                return console.error('this.removeParams.url is undefined');
            }

            $.ajax({
                type       : 'DELETE',
                dataType   : 'json',
                contentType: 'application/json',
                url        : url,
                data       : dataStr,
                success    : function () {
                    var params = self.pageParams;
                    var page = params.page;
                    var fetchParams = _.extend({reset: true}, params);

                    self.collection.getPage(page, fetchParams); //fetch and re-render
                },
                error      : self.handleErrorResponse //TODO
            });
        },

        showItem: function(e) {
            var target = $(e.target);
            var itemId = target.closest('tr').data('id');
            var url = this.url + '/' + itemId;

            Backbone.history.navigate(url, {trigger: true});
        }

    });

    return View;
});
