var options;
function show_error(str) {
	$('#errors').append('<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Error!</strong> ' + str + '</div>');
}


function get_auth_data(form_element) {
	var data = {};
	$.each(form_element, function(key, val) {
		if (val.name) {
			data[val.name] = val.value;
		}
	});

	return data;
}

function show_buttons(ref, mode){
	if (mode == "editing") {
		ref.closest('tr').find('[data-name="save-button"] button').show();
		ref.closest('tr').find('[data-name="cancel-button"] button').show();
		ref.closest('tr').find('[data-name="edit-button"] button').hide();
	}
	else if (mode == "view"){
		ref.closest('tr').find('[data-name="save-button"] button').hide();
		ref.closest('tr').find('[data-name="cancel-button"] button').hide();
		ref.closest('tr').find('[data-name="edit-button"] button').show();
	}
}

function is_fqdn(domain) {
	if(domain.slice(-1) == ".") {
		return true;
	}
	return false;
}

function create_fqdn(domain, html) {
	html = html === undefined ? false : true;
	if (is_fqdn(domain)) {
		return domain;
	}
	else {
		var auth_data = get_auth_data(document.getElementById('auth_form'));
		var fqdn;
		if (html) {
			if (domain.length == 0) {
				fqdn = domain + '<span class="text-muted">' + auth_data.zone + '.</span>';
			}
			else {
				fqdn = domain + '<span class="text-muted">.' + auth_data.zone + '.</span>';
			}
		}
		else {
			fqdn = domain + '.' + auth_data.zone + '.';
		}

		return fqdn;
	}
}

function get_subdomain(domain) {
	console.log(domain);
	var auth_data = get_auth_data(document.getElementById('auth_form'));
	if (is_fqdn(domain)) {
		return domain.slice(-1*(auth_data.zone.length + 2));
	}
	else if (domain.slice(-1*(auth_data.zone.length)) == auth_data.zone){
		return domain.replace(domain.slice(-1*(auth_data.zone.length + 1)), ""); 
	}

	return domain;
}

function attach_button_action() {
	$('#records [data-name="delete-button"] button').on('click', function (e) {
		var record = {};
		e.preventDefault();
		var data = get_auth_data(document.getElementById('auth_form'));

		$(this).closest('tr').find('[data-var="yes"]').each(function () {
			record[$(this).attr('data-name').replace("record-", "")] = $(this).text();
		});

		if(!confirm("Are you sure you want to delete\n" + record['name'] + " " + record['type'] + " " + record['data'] + "?")){
			return;
		}

		data['record'] = record;
		$.post($('#proxy-path').val()+'/delete-record', JSON.stringify(data), reload_zone);
	});

	$('#records [data-name="edit-button"] button').on('click', function (e) {
		$(this).closest('tr').find('[data-var="yes"]').each(function () {
			var dataName = $(this).attr('data-name');

			if(dataName == "record-name") {
				$(this).html('<input type="text" name="' + dataName + '" class="form-control" value="' + $(this).attr('data-original') + '">');
			}
			else if(dataName == "record-type") {
				selectedType = $(this).text();
				$(this).html('<select name="type" class="form-control"><option></option></select>');
				$(this).closest('tr').find('select').html(options.join(''));
				$(this).closest('tr').find('select').val(selectedType);
			}
			else {
				$(this).html('<input type="text" name="' + dataName + '" class="form-control" value="' + $(this).attr('data-original') + '">');
			}

		});

		show_buttons($(this), 'editing');


	});	

	$('#records [data-name="cancel-button"] button').on('click', function (e) {
		$(this).closest('tr').find('[data-var="yes"]').each(function () {
			var dataName = $(this).attr('data-name');

			if(dataName == "record-name"){
				$(this).html(create_fqdn($(this).attr('data-original'), true));
			}
			else{
				$(this).html($(this).attr('data-original'));
			}

		});

		show_buttons($(this), 'view');
	});

	$('#records [data-name="save-button"] button').on('click', function (e) {
		e.preventDefault();
		var data = get_auth_data(document.getElementById('auth_form'));
        var record = {original: {}, new: {}};
		$(this).closest('tr').find('[data-var="yes"]').each(function() {

			var name = $(this).attr('data-name').replace('record-', "");
			var value = $(this).children().first().val();

			if (name == 'name') {
				record['original'][name] = create_fqdn($(this).attr('data-original'));
				record['new'][name] = create_fqdn(value);
			} else {
				record['original'][name] = $(this).attr('data-original');
				record['new'][name] = value;
			}
		});

		show_buttons($(this), 'view');

		data['record'] = record;
		$.post($('#proxy-path').val()+'/update-record', JSON.stringify(data), function (data) {
			if (data.error) {
            	show_error(data.message);
            } else {
				reload_zone();
			}
        });
	});
}

function reload_zone() {
	var auth_data = get_auth_data(document.getElementById('auth_form'));

	$("#records > tbody > tr").remove();

	$.post($('#proxy-path').val()+'/axfr', JSON.stringify(auth_data), function (data) {
		var body;
		var rr_filter = $('#rr-filter').val().split(',');

		if (data.error) {
			show_error(data.message);
			return;
		}

		body = $('#records > tbody');
		$.each(data.records, function (key, val) {
			var r = new Array();
			var i = 0;
			
			if ($.inArray(val['type'], rr_filter) != -1)
				return;

			r[i++] = '<tr>';
			$.each(val, function (rkey, rval) {
				if (rkey == 'name') {
					rval = get_subdomain(rval);
					r[i++] = '<td data-name="record-' + rkey + '" data-var="yes" data-original="' + rval + '">' + create_fqdn(rval, true) + '</td>';
				} else {
					r[i++] = '<td data-name="record-' + rkey + '" data-var="yes" data-original="' + rval + '">' + rval + '</td>';
				}
			});
			r[i++] = '<td class="col-control">';
			r[i++] = '<div data-name="save-button" data-name="buttons" style="display: inline"><button data-original-title="Save changes" type="button" class="btn btn-success btn-xs btn-tooltip" style="display: none"><span class="glyphicon glyphicon-ok"></span></button></div>';
			r[i++] = '<div data-name="cancel-button" data-name="buttons" style="display: inline"><button data-original-title="Cancel changes" type="button" class="btn btn-danger btn-xs btn-tooltip" style="display: none"><span class="glyphicon glyphicon-remove"></span></button></div>';
			r[i++] = '<div data-name="edit-button" data-name="buttons" style="display: inline"><button data-original-title="Edit record" type="button" class="btn btn-info btn-xs btn-tooltip"><span class="glyphicon glyphicon-edit"></span></button></div>';
			r[i++] = '<div data-name="delete-button" data-name="buttons" style="display: inline"><button data-original-title="Delete record" type="button" class="btn btn-danger btn-xs btn-tooltip"><span class="glyphicon glyphicon-minus"></span></button></div>';
			r[i++] = '</td>';
			r[i++] = '</tr>';
			body.append(r.join(''));

			$('.btn-tooltip').tooltip();
		
		});
		attach_button_action();
		
	});

}

function connect_to_proxy() {

$('#rr-add [name="type"]').empty();
$('#key-type').empty();

$.post($('#proxy-path').val()+'/ping', '', function (data) {

	$('#proxy-path').closest("div.form-group").removeClass('has-error');
	$('#proxy-path').closest("div.form-group").addClass('has-success');

	$.post($('#proxy-path').val()+'/supported-key-types', '', function (data) {
		options = new Array();
		Object.keys(data).forEach(function (key) {
			options.push('<option value="' + key + '">' + data[key] + '</option>');
		});
		$('#key-type').append(options.join(''));
	});

	$.post($('#proxy-path').val()+'/supported-rr-types', '', function (data) {
		options = new Array();
		Object.keys(data).forEach(function (key) {
			options.push('<option value="' + key + '">' + data[key] + '</option>');
		});
		$('#rr-add [name="type"]').append(options.join(''));
	});
}).fail(function() {
	$('#proxy-path').closest("div.form-group").addClass('has-error');
	$('#proxy-path').closest("div.form-group").removeClass('has-success');
});
}

$(function () {
	$(document).ajaxError(function(event, jqxhr, settings, exception) {
		if (jqxhr.responseText.length > 0) {
			show_error(jqxhr.responseText);
		} else {
			show_error(jqxhr.status + " " + jqxhr.statusText);
		}
	});

	connect_to_proxy();

	$('#proxy-path').on('change', connect_to_proxy);

	$('#zone').on('change', function (e) {
		var data = {};
		data[this.name] = this.value;

		$.post($('#proxy-path').val()+'/zone-to-server', JSON.stringify(data), function (data) {
			$('#server').val(data.server);
		});
	});

	$('#auth_form').on('submit', function (e) {
		e.preventDefault();
		reload_zone();
	});

	$('#records [data-name="add-button"] button').on('click', function (e) {
		e.preventDefault();
		var data = get_auth_data(document.getElementById('auth_form'));
        var record = {};
		$.each(document.getElementById('rr-add'), function(key, val) {
			if (val.name) {
				if (val.name == 'name') {
					// if ends with dot, don't append zone
					if(val.value.slice(-1) == "."){
						record[val.name] = val.value;
					}
					else{
						record[val.name] = val.value + (val.value.length == 0 ? '' : '.') + data.zone;
					}
				} else {
					record[val.name] = val.value;
				}
			}
		});

		data['record'] = record;
		$.post($('#proxy-path').val()+'/add-record', JSON.stringify(data), function (data) {
			if (data.error) {
            	show_error(data.message);
            } else {
				reload_zone();
			}
        });
	});
});
