define([
    //todo get this files by contentType automaticly
    //'views/domain/createView',
    //'views/domain/editView',
    //"text!templates/domain/newThumbnail.html",
    //"text!templates/domain/newRow.html",
], function (/*CreateView, EditView, newThumbnail, newRow*/) {
    var View = Backbone.View.extend({
        listLength          : null,
        defaultItemsNumber  : null,
        newCollection       : null,
        $pagination         : null,
        //templateNewRow      : _.template(newRow),
        //templateNewThumbnail: _.template(newThumbnail),

        //<editor-fold desc="Pagination">

        changeLocationHash: function (page, count, filter) {
            var location = window.location.hash;
            var mainLocation = '#qualPro/' + this.contentType + '/' + this.viewType;
            var pId = (location.split('/pId=')[1]) ? location.split('/pId=')[1].split('/')[0] : '';
            var url;
            var thumbnails;
            var locationFilter;
            var notEmptyFilter;

            if (!page && this.viewType == 'list') {
                page = (location.split('/p=')[1]) ? location.split('/p=')[1].split('/')[0] : 1;
            }

            if (!count) {
                thumbnails = location.split('thumbnails')[0];
                count = (location.split('/c=')[1]) ? location.split('/c=')[1].split('/')[0] : 100;

                if (thumbnails && count < 100) {
                    count = 100;
                }
            }

            url = mainLocation;
            if (pId) {
                url += '/pId=' + pId;
            }
            if (page) {
                url += '/p=' + page;
            }
            if (count) {
                url += '/c=' + count;
            }
            if (!filter) {
                locationFilter = location.split('/filter=')[1];
                filter = (locationFilter) ? JSON.parse(decodeURIComponent(locationFilter)) : null;
            }
            if (filter) {
                notEmptyFilter = false;
                for (var i in filter) {
                    if (filter[i] && filter[i].length !== 0) {
                        notEmptyFilter = true;
                    }
                }
                if (notEmptyFilter) {
                    url += '/filter=' + encodeURIComponent(JSON.stringify(filter));
                } else {
                    url += '';
                }
            }

            Backbone.history.navigate(url);
        },

        nextPage: function (options) {
            var itemsNumber = $("#itemsNumber").text();
            var page = parseInt($("#currentShowPage").val()) + 1;
            var pageNumber = $("#lastPage").text();
            var itemsOnPage = 7;

            $("#pageList").empty();

            if (pageNumber <= itemsOnPage) {
                for (var i = 1; i <= pageNumber; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (pageNumber >= itemsOnPage && page > 3 && page < pageNumber - 3) {
                for (var i = page - 3; i <= page + 3; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (pageNumber >= itemsOnPage && page <= itemsOnPage) {
                for (var i = 1; i <= itemsOnPage; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (page >= pageNumber - 3) {
                for (var i = pageNumber - 6; i <= pageNumber; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            }

            $("#currentShowPage").val(page);
            $("#gridStart").text((page - 1) * itemsNumber + 1);

            if (this.listLength <= page * itemsNumber) {
                $("#gridEnd").text(this.listLength);
                $("#nextPage").prop("disabled", true);
                $("#lastShowPage").prop("disabled", true);
            } else {
                $("#gridEnd").text(page * itemsNumber);
            }

            $("#previousPage").prop("disabled", false);
            $("#firstShowPage").prop("disabled", false);

            options = options || {
                    count : itemsNumber,
                    filter: this.filter
                };

            this.collection.getNextPage(options);
            this.changeLocationHash(page, itemsNumber);
        },

        previousPage: function (options) {
            var itemsNumber = $("#itemsNumber").text();
            var currentShowPage = $("#currentShowPage");
            var page = parseInt(currentShowPage.val()) - 1;
            var pageNumber;
            var itemsOnPage;

            currentShowPage.val(page);

            if (page === 1) {
                $("#previousPage").prop("disabled", true);
                $("#firstShowPage").prop("disabled", true);
            }

            pageNumber = $("#lastPage").text();
            itemsOnPage = 7;

            $("#pageList").empty();

            if (pageNumber <= itemsOnPage) {
                for (var i = 1; i <= pageNumber; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (pageNumber >= itemsOnPage && page <= itemsOnPage) {
                for (var i = 1; i <= itemsOnPage; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (pageNumber >= itemsOnPage && page > 3 && page <= pageNumber - 3) {
                for (var i = page - 3; i <= page + 3; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else if (page >= page - 3) {
                for (var i = pageNumber - 6; i <= pageNumber; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            }

            $("#gridStart").text((page - 1) * itemsNumber + 1);

            if (this.listLength <= page * itemsNumber) {
                $("#gridEnd").text(this.listLength);
            } else {
                $("#gridEnd").text(page * itemsNumber);
            }

            $("#nextPage").prop("disabled", false);
            $("#lastShowPage").prop("disabled", false);

            options = options || {
                    count : itemsNumber,
                    filter: this.filter
                };

            this.collection.getPreviousPage(options);
            this.changeLocationHash(page, itemsNumber);
        },

        firstPage: function (options) {
            var itemsNumber = $("#itemsNumber").text();
            var currentShowPage = $("#currentShowPage");
            var page = 1;
            var lastPage = $("#lastPage").text();

            currentShowPage.val(page);

            $("#firstShowPage").prop("disabled", true);

            $("#pageList").empty();

            if (lastPage >= 7) {
                for (var i = 1; i <= 7; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else {
                for (var i = 1; i <= lastPage; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            }
            $("#gridStart").text((page - 1) * itemsNumber + 1);

            if (this.listLength <= 1 * itemsNumber) {
                $("#gridEnd").text(this.listLength);
            } else {
                $("#gridEnd").text(page * itemsNumber);
            }

            $("#previousPage").prop("disabled", true);
            $("#nextPage").prop("disabled", false);
            $("#lastShowPage").prop("disabled", false);

            options = options || {
                    count : itemsNumber,
                    filter: this.filter
                };

            this.collection.getFirstPage(options);
            this.changeLocationHash(1, itemsNumber);
        },

        lastPage: function (options) {
            var itemsNumber = $("#itemsNumber").text();
            var page = $("#lastPage").text();

            $("#firstShowPage").prop("disabled", true);
            $("#pageList").empty();

            if (page >= 7) {
                for (var i = page - 6; i <= page; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            } else {
                for (var i = 1; i <= page; i++) {
                    $("#pageList").append('<li class="showPage">' + i + '</li>');
                }
            }

            $("#currentShowPage").val(page);
            $("#gridStart").text((page - 1) * itemsNumber + 1);

            if (this.listLength <= page * itemsNumber) {
                $("#gridEnd").text(this.listLength);
                $("#nextPage").prop("disabled", true);
            } else {
                $("#gridEnd").text(page * itemsNumber);
            }

            $("#nextPage").prop("disabled", true);
            $("#lastShowPage").prop("disabled", true);
            $("#previousPage").prop("disabled", false);
            $("#firstShowPage").prop("disabled", false);

            options = options || {
                    page  : page,
                    count : itemsNumber,
                    filter: this.filter
                };

            this.collection.getLastPage(options);
            this.changeLocationHash(page, itemsNumber);
        },

        getPage: function (options) {
            var itemsNumber;
            var page;
            var adr = /^\d+$/;
            var lastPage;
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

        pageElementRender: function (totalCount, currentPage) {
            var itemsNumber = this.defaultItemsNumber;
            var start = $("#gridStart");
            var end = $("#gridEnd");
            var pageNumber;
            var itemsOnPage = 7;

            $("#itemsNumber").text(itemsNumber);

            if (totalCount === 0 || totalCount === undefined) {
                start.text(0);
                end.text(0);

                $("#gridCount").text(0);
                $("#previousPage").prop("disabled", true);
                $("#nextPage").prop("disabled", true);
                $("#firstShowPage").prop("disabled", true);
                $("#lastShowPage").prop("disabled", true);
                $("#pageList").empty();
                $("#currentShowPage").val(0);
                $("#lastPage").text(0);
            } else {
                currentPage = currentPage || 1;
                start.text(currentPage * itemsNumber - itemsNumber + 1);

                if (totalCount <= itemsNumber || totalCount <= currentPage * itemsNumber) {
                    end.text(totalCount);
                } else {
                    end.text(currentPage * itemsNumber);
                }
                $("#gridCount").text(totalCount);
                $("#pageList").empty();

                pageNumber = Math.ceil(totalCount / itemsNumber);

                if (pageNumber <= itemsOnPage) {
                    for (var i = 1; i <= pageNumber; i++) {
                        $("#pageList").append('<li class="showPage">' + i + '</li>');
                    }
                } else if (pageNumber >= itemsOnPage && currentPage <= itemsOnPage) {
                    for (var i = 1; i <= itemsOnPage; i++) {
                        $("#pageList").append('<li class="showPage">' + i + '</li>');
                    }
                } else if (pageNumber >= itemsOnPage && currentPage > 3 && currentPage <= pageNumber - 3) {
                    for (var i = currentPage - 3; i <= currentPage + 3; i++) {
                        $("#pageList").append('<li class="showPage">' + i + '</li>');
                    }
                } else if (currentPage >= pageNumber - 3) {
                    for (var i = pageNumber - 6; i <= pageNumber; i++) {
                        $("#pageList").append('<li class="showPage">' + i + '</li>');
                    }
                }

                $("#lastPage").text(pageNumber);
                $("#currentShowPage").val(currentPage);
                $("#previousPage").prop("disabled", parseInt(start.text()) <= parseInt(currentPage));
                $("#firstShowPage").prop("disabled", parseInt(start.text()) <= parseInt(currentPage));

                if (pageNumber <= 1) {
                    $("#nextPage").prop("disabled", true);
                    $("#lastShowPage").prop("disabled", true);
                } else {
                    $("#nextPage").prop("disabled", parseInt(end.text()) === parseInt(totalCount));
                    $("#lastShowPage").prop("disabled", parseInt(end.text()) === parseInt(totalCount));
                }
            }
        },

        switchPageCounter: function (e) {
            e.preventDefault();

            var self = this;
            var itemsNumber = e.target.textContent;

            this.defaultItemsNumber = itemsNumber;

            $("#top-bar-deleteBtn").hide();
            $('#check_all').prop('checked', false);

            this.collection.getPage(1, {
                count        : itemsNumber,
                page         : 1,
                filter       : this.filter,
                newCollection: false,
                success      : function () {
                    self.render();
                }
            });

            this.changeLocationHash(1, itemsNumber);
        },

        // </editor-fold>

        // <editor-fold desc="Checkboxes">

        addCheckboxesFunctionality: function (context) {
            var currentEl;

            if (!context) {
                context = this;
            }

            currentEl = context.$el;

            currentEl.find(".checkbox").click(function (e) {
                e.stopPropagation();

                setViewStateAfterCheck();
            });

            currentEl.find(".checkboxArea").click(function (e) {
                var checkbox;

                e.stopPropagation();
                checkbox = $(e.target).children('input:checkbox');
                checkbox.prop('checked', !checkbox.is(':checked'));

                setViewStateAfterCheck();
            });

            var setViewStateAfterCheck = function () {

                if (!context.$checkAll) {
                    //todo change after button behavior adding
                    return;
                }

                var checkLength;
                var collectionLength = context.collection.length;
                if (collectionLength > 0) {
                    checkLength = $("input.checkbox:checked").length;

                    if (checkLength === collectionLength) {
                        context.$checkAll.prop('checked', true);
                    } else {
                        context.$checkAll.prop('checked', false);
                    }
                }
            };

        },

        addCheckAllFunctionality: function (context) {
            var currentEl;

            if (!context) {
                context = this;
            }

            currentEl = context.$el;
            context.$checkAll = currentEl.find('#check_all');
            context.$checkAll.click(function () {
                $(':checkbox').prop('checked', this.checked);

                //if ($("input.checkbox:checked").length > 0) {
                //    $("#top-bar-deleteBtn").show();
                //} else {
                //    $("#top-bar-deleteBtn").hide();
                //}
            });
        },

        // </editor-fold>
        checked: function (e) {
            e.stopPropagation();
        },

        inputClick: function (e) {
            var checkBoxes = this.$el.find('input[type="checkbox"]:checked');

            if (checkBoxes.length) { //not because we have benn subscribed for label click and auto input click
                this.$btnHolder.show();
            } else {
                this.$btnHolder.hide();
            }

            e.stopPropagation();
        },

        createItem: function () {
            var contentType = this.contentType;
            var viewType = this.viewType;
            var parentId = this.parentId;
            var modelUrl = 'models/' + contentType;
            var self = this;
            require([modelUrl], function (Model) {
                var createView = new CreateView({
                    Model      : Model,
                    contentType: contentType,
                    viewType   : viewType,
                    parentId   : parentId
                });
                createView.on('modelSaved', function (data) {
                    var curEl = $('#contentHolder');

                    data = data.toJSON();

                    self.collection.add(data, {remove: false});

                    if (self.viewType === 'list') {
                        curEl.find('#listTable').append(self.templateNewRow({domain: data}));
                    } else {
                        curEl.append(self.templateNewThumbnail({domain: data}));
                    }
                });
            });
        },

        editItem: function () {
            var contentType = this.contentType;
            var viewType = this.viewType;
            var parentId = this.parentId;
            var curentId = this.$el.find('input[type="checkbox"]:checked').attr('id');
            var model = this.collection.get(curentId);

            new EditView({
                model      : model,
                contentType: contentType,
                viewType   : viewType,
                parentId   : parentId
            });
        },

        showFilteredContent: function (value) {
            var self = this;

            var filter = {
                'archived': {
                    type  : 'boolean',
                    values: [value]
                }
            };

            var creationOptions = {
                viewType     : this.viewType,
                page         : 1,
                filter       : filter,
                parentId     : this.parentId,
                newCollection: true,
                success      : function () {
                    self.render();
                }
            };

            this.filter = filter;

            this.collection.getPage(1, creationOptions);
        },

        pageSwitcherRenderer: function (contentType) {
            var text = contentType.capitalizer('caps');

            this.$mainContent.text(text);
            this.$createBtn.text('New ' + text);
        }

    });

    return View;
});